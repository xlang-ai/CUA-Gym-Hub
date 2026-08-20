import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { secureMockApiPlugin } from './secureMockApiPlugin.mjs';

function request(plugin, url, headers = {}) {
  let middleware;
  plugin.configureServer({
    middlewares: {
      use(handler) {
        middleware = handler;
      },
    },
  });

  return new Promise((resolve, reject) => {
    let status;
    let responseHeaders;
    let nextCalled = false;
    const req = { method: 'GET', url, headers: { host: 'localhost', ...headers } };
    const res = {
      writeHead(nextStatus, nextHeaders) {
        status = nextStatus;
        responseHeaders = nextHeaders;
      },
      end(body) {
        resolve({
          status,
          headers: responseHeaders,
          body: JSON.parse(body),
          nextCalled,
        });
      },
    };
    try {
      middleware(req, res, () => {
        nextCalled = true;
        resolve({ status: null, headers: {}, body: null, nextCalled });
      });
    } catch (error) {
      reject(error);
    }
  });
}


/** POST helper. The GET helper above cannot exercise /post, where the baseline bug lives. */
function post(plugin, url, payload, headers = {}) {
  let middleware;
  plugin.configureServer({ middlewares: { use(handler) { middleware = handler; } } });
  return new Promise((resolve, reject) => {
    let status;
    const body = JSON.stringify(payload);
    const listeners = {};
    const req = {
      method: 'POST',
      url,
      headers: { host: 'localhost', 'content-type': 'application/json', ...headers },
      on(event, cb) { listeners[event] = cb; return req; },
      setEncoding() { return req; },
    };
    const res = {
      writeHead(next) { status = next; },
      end(responseBody) { resolve({ status, body: responseBody ? JSON.parse(responseBody) : null }); },
    };
    try {
      middleware(req, res, () => resolve({ status: null, body: null, nextCalled: true }));
      // the plugin subscribes after the call returns
      queueMicrotask(() => {
        if (listeners.data) listeners.data(Buffer.from(body));
        if (listeners.end) listeners.end();
      });
    } catch (error) { reject(error); }
  });
}

test('hardened /state returns the legacy-compatible state envelope', async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cua-secure-state-'));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

  process.env.CUA_GYM_HARDENED = '1';
  process.env.CUA_GYM_ADMIN_TOKEN = 'test-admin-token';
  fs.writeFileSync(
    path.join(stateDir, 'task-123.json'),
    JSON.stringify({ tickets: [{ id: 'T-1', status: 'open' }] }),
  );

  const response = await request(
    secureMockApiPlugin({ stateDir }),
    '/state?sid=task-123',
    { 'x-cua-admin-token': 'test-admin-token' },
  );

  assert.equal(response.status, 200);
  assert.equal(response.nextCalled, false);
  assert.deepEqual(response.body, {
    stored_state: { tickets: [{ id: 'T-1', status: 'open' }] },
    has_custom_state: true,
    sid: 'task-123',
  });
});

test('hardened /state reports an absent session without inventing state', async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cua-secure-state-'));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

  process.env.CUA_GYM_HARDENED = '1';
  process.env.CUA_GYM_ADMIN_TOKEN = 'test-admin-token';

  const response = await request(
    secureMockApiPlugin({ stateDir }),
    '/state?sid=missing',
    { 'x-cua-admin-token': 'test-admin-token' },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    stored_state: null,
    has_custom_state: false,
    sid: 'missing',
  });
});


test('a partial injection does not fabricate state_diff entries', async (t) => {
  // The reward-signal bug. `set` receives whatever the task author chose to specify — a couple
  // of keys — while the app fills the rest from its own defaults before rendering and pushes the
  // complete object back with `set_current`. Storing the PARTIAL object as the baseline makes
  // /go diff a 2-key initial against a 30-key current and report every default as something the
  // agent added, before the agent has done anything at all.
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cua-secure-diff-'));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  process.env.CUA_GYM_HARDENED = '1';
  process.env.CUA_GYM_ADMIN_TOKEN = 'test-admin-token';

  const plugin = secureMockApiPlugin({ stateDir });
  const admin = { 'x-cua-admin-token': 'test-admin-token' };

  // task author injects two keys
  await post(plugin, '/post?sid=diff-1', { action: 'set', state: { tickets: [{ id: 'T-1' }] } }, admin);

  // the app renders, merges its defaults, and pushes the full object back
  const full = {
    tickets: [{ id: 'T-1' }],
    users: [{ name: 'admin' }],
    settings: { theme: 'light' },
    notifications: [],
  };
  await post(plugin, '/post?sid=diff-1', { action: 'set_current', state: full }, admin);

  const go = await request(plugin, '/go?sid=diff-1', admin);
  assert.equal(go.status, 200);
  assert.deepEqual(
    go.body.state_diff,
    {},
    'the agent has done nothing, so the diff must be empty — anything here is fabricated',
  );
  assert.deepEqual(go.body.initial_state, full, 'the baseline must be the fully-populated state');
});

test('a real change after the baseline still shows up in state_diff', async (t) => {
  // The guard on the fix above: deferring the baseline must not swallow genuine changes.
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cua-secure-diff-'));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  process.env.CUA_GYM_HARDENED = '1';
  process.env.CUA_GYM_ADMIN_TOKEN = 'test-admin-token';

  const plugin = secureMockApiPlugin({ stateDir });
  const admin = { 'x-cua-admin-token': 'test-admin-token' };

  await post(plugin, '/post?sid=diff-2', { action: 'set', state: { tickets: [] } }, admin);
  await post(plugin, '/post?sid=diff-2', { action: 'set_current', state: { tickets: [], users: [] } }, admin);
  // now the agent actually does something
  await post(plugin, '/post?sid=diff-2', { action: 'set_current', state: { tickets: [{ id: 'T-9' }], users: [] } }, admin);

  const go = await request(plugin, '/go?sid=diff-2', admin);
  assert.ok(Object.keys(go.body.state_diff).length > 0, 'a genuine change must still be reported');
});
