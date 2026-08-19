import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import { useParams, Link } from 'react-router-dom';
import { Copy, Plus, Trash2, X } from 'lucide-react';

const TEST_TEMPLATES = {
  'API Gateway XWS Proxy': '{\n  "httpMethod": "GET",\n  "path": "/test",\n  "queryStringParameters": null,\n  "body": null\n}',
  'S3 Put': '{\n  "Records": [{\n    "s3": {\n      "bucket": { "name": "my-bucket" },\n      "object": { "key": "test.txt" }\n    }\n  }]\n}',
  'Scheduled Event': '{\n  "source": "aws.events",\n  "detail-type": "Scheduled Event",\n  "time": "2024-03-15T10:00:00Z"\n}',
  'Custom': '{\n  "key1": "value1",\n  "key2": "value2"\n}',
};

export default function LambdaFunctionDetail() {
  const { functionName } = useParams();
  const { state, dispatch, addFlash } = useStore();
  const [aliasForm, setAliasForm] = useState(null);
  const [versionForm, setVersionForm] = useState(null);
  const [triggerForm, setTriggerForm] = useState(null);

  // Aliases and versions live in state so they can be created, listed and verified. The tab
  // used to render two literal rows, which no action could change.
  const aliases = (state.lambdaAliases || []).filter(a => a.functionName === functionName);
  const versions = (state.lambdaVersions || []).filter(v => v.functionName === functionName);

  const createAlias = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESOURCE_CREATE', payload: { path: 'lambdaAliases', key: 'name', item: {
      functionName, name: aliasForm.name.trim(), version: aliasForm.version, description: aliasForm.description,
    }}});
    addFlash('success', `Created alias ${aliasForm.name.trim()} pointing at version ${aliasForm.version}`);
    setAliasForm(null);
  };

  const addTrigger = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'lambda', key: 'name', id: functionName,
      fields: { triggers: [...(func.triggers || []), { ...triggerForm }] } } });
    addFlash('success', `Added ${triggerForm.type} trigger on ${triggerForm.source} to ${functionName}`);
    setTriggerForm(null);
  };

  const publishVersion = (e) => {
    e.preventDefault();
    const numbered = versions.map(v => Number(v.version)).filter(n => !Number.isNaN(n));
    const next = String((numbered.length ? Math.max(...numbered) : 0) + 1);
    dispatch({ type: 'RESOURCE_CREATE', payload: { path: 'lambdaVersions', key: 'version', item: {
      functionName, version: next, description: versionForm.description,
      published: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }}});
    addFlash('success', `Published version ${next} of ${functionName}`);
    setVersionForm(null);
  };
  const func = state.lambda.find(f => f.name === functionName);
  const [tab, setTab] = useState('Code');
  const [code, setCode] = useState('');
  const [testEvent, setTestEvent] = useState(TEST_TEMPLATES['Custom']);
  const [testTemplate, setTestTemplate] = useState('Custom');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [configTab, setConfigTab] = useState('General');
  const [envVars, setEnvVars] = useState([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');
  const [editMemory, setEditMemory] = useState(128);
  const [editTimeout, setEditTimeout] = useState(3);
  const [editDescription, setEditDescription] = useState('');
  const [triggersList] = useState([
    { source: 'API Gateway', arn: 'arn:aws:execute-api:us-east-1:123456789012:abc123/prod', status: 'Enabled' },
  ]);

  useEffect(() => {
    if (func) {
      setCode(func.code);
      setEditMemory(func.memorySize || 128);
      setEditTimeout(func.timeout || 3);
      setEditDescription(func.description || '');
      const env = func.environment ? Object.entries(func.environment).map(([k, v]) => ({ key: k, value: v })) : [];
      setEnvVars(env);
    }
  }, [func?.name]);

  if (!func) {
    return <div className="p-8 text-center text-aws-text-secondary">Function not found.</div>;
  }

  const arn = `arn:aws:lambda:${state.user.region}:123456789012:function:${func.name}`;
  const fileName = func.runtime?.startsWith('python') ? 'lambda_function.py' : 'index.js';

  const handleDeploy = () => {
    dispatch({ type: 'UPDATE_FUNCTION_CODE', payload: { name: func.name, code } });
    addFlash('success', 'Changes deployed successfully');
  };

  const handleTest = () => {
    setRunning(true);
    setOutput(null);
    setTimeout(() => {
      const reqId = `${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}`;
      const duration = (Math.random() * 50 + 5).toFixed(2);
      const billed = Math.ceil(parseFloat(duration));
      const maxMem = Math.floor(Math.random() * 40 + 40);
      setOutput({
        success: true,
        response: { statusCode: 200, body: JSON.stringify({ message: 'Execution successful' }) },
        logs: [
          `START RequestId: ${reqId} Version: $LATEST`,
          `${new Date().toISOString()} INFO Processing event...`,
          `END RequestId: ${reqId}`,
          `REPORT RequestId: ${reqId} Duration: ${duration} ms Billed Duration: ${billed} ms Memory Size: ${func.memorySize} MB Max Memory Used: ${maxMem} MB`
        ],
        duration,
        billed,
        memoryConfigured: func.memorySize,
        maxMemory: maxMem
      });
      setRunning(false);
    }, 1500);
  };

  const tabs = ['Code', 'Test', 'Monitor', 'Configuration', 'Aliases', 'Versions'];

  return (
    <div className="space-y-4">
      {/* Function header */}
      <div>
        <h1 className="text-2xl font-bold">{func.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-aws-text-secondary font-mono">{arn}</span>
          <button className="text-aws-text-disabled hover:text-aws-text"><Copy size={12} /></button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-4 border-b border-aws-border">
        {tabs.map(t => (
          <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)} className={`pb-3 px-1 text-sm font-medium border-b-2 ${tab === t ? 'border-aws-orange text-aws-orange' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Code' && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="aws-btn aws-btn-primary" onClick={handleDeploy}>Deploy</button>
            <button className="aws-btn aws-btn-secondary" onClick={() => { setTab('Test'); handleTest(); }}>Test</button>
          </div>
          {/* Code editor */}
          <div className="aws-card p-0 overflow-hidden">
            <div className="bg-gray-800 text-gray-300 px-4 py-2 text-xs font-mono border-b border-gray-700">
              {fileName}
            </div>
            <textarea
              className="w-full p-4 font-mono text-sm focus:outline-none resize-none"
              style={{ background: '#1E1E1E', color: '#D4D4D4', minHeight: 400 }}
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck="false"
            />
          </div>
          {/* Runtime info */}
          <div className="text-xs text-aws-text-secondary flex gap-4">
            <span>Runtime: {func.runtime}</span>
            <span>Handler: {func.handler}</span>
            <span>Architecture: x86_64</span>
          </div>
        </div>
      )}

      {tab === 'Test' && (
        <div className="space-y-4">
          <div className="aws-card">
            <h3 className="font-bold text-sm mb-3">Test event</h3>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm text-aws-text-secondary">Template:</label>
              <select className="aws-input w-auto" value={testTemplate} onChange={e => { setTestTemplate(e.target.value); setTestEvent(TEST_TEMPLATES[e.target.value]); }}>
                {Object.keys(TEST_TEMPLATES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <textarea
              className="w-full p-3 font-mono text-sm border border-aws-border focus:outline-none focus:border-aws-blue"
              style={{ minHeight: 150, borderRadius: 2 }}
              value={testEvent}
              onChange={e => setTestEvent(e.target.value)}
              spellCheck="false"
            />
            <div className="mt-3">
              <button className="aws-btn aws-btn-primary" onClick={handleTest} disabled={running}>
                {running ? 'Executing...' : 'Test'}
              </button>
            </div>
          </div>

          {output && (
            <div className="aws-card space-y-4">
              <div className={`p-3 border-l-4 ${output.success ? 'border-l-aws-success bg-aws-status-success-bg' : 'border-l-aws-error bg-aws-status-error-bg'}`}>
                <span className="font-bold text-sm">{output.success ? 'Execution result: succeeded' : 'Execution result: failed'}</span>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2">Response</h4>
                <pre className="p-3 bg-aws-status-info-bg/30 border border-aws-border-secondary text-sm font-mono overflow-auto" style={{ borderRadius: 2 }}>
                  {JSON.stringify(JSON.parse(output.response.body), null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2">Function Logs</h4>
                <div className="p-3 font-mono text-xs overflow-auto" style={{ background: '#1E1E1E', color: '#D4D4D4', borderRadius: 2 }}>
                  {output.logs.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
              <div className="text-sm text-aws-text-secondary">
                Duration: {output.duration} ms | Billed duration: {output.billed} ms | Memory: {output.memoryConfigured} MB | Max memory: {output.maxMemory} MB
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Configuration' && (
        <div className="flex gap-0">
          {/* Config sub-tabs sidebar */}
          <div className="w-48 border-r border-aws-border flex-shrink-0">
            {['General', 'Triggers', 'Permissions', 'Environment variables', 'Tags'].map(ct => (
              <button
                key={ct}
                onClick={() => setConfigTab(ct)}
                className={`w-full text-left px-4 py-2 text-sm border-l-3 ${configTab === ct ? 'border-l-aws-orange bg-aws-status-warning-bg/50 text-aws-orange font-medium' : 'border-l-transparent text-aws-text-secondary hover:bg-aws-status-info-bg/30'}`}
                style={{ borderLeftWidth: 3 }}
              >
                {ct}
              </button>
            ))}
          </div>
          {/* Config content */}
          <div className="flex-1 p-4">
            {configTab === 'General' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-sm mb-3">General configuration</h3>
                  <div className="grid grid-cols-1 gap-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-bold mb-1">Description</label>
                      <input className="aws-input" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Function description" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Memory (MB)</label>
                      <div className="flex items-center gap-3">
                        <input type="range" min="128" max="3008" step="64" value={editMemory} onChange={e => setEditMemory(Number(e.target.value))} className="flex-1" />
                        <span className="text-sm font-mono w-16 text-right">{editMemory} MB</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Timeout (seconds)</label>
                      <input type="number" className="aws-input w-32" min={1} max={900} value={editTimeout} onChange={e => setEditTimeout(Number(e.target.value))} />
                    </div>
                    <div className="pt-2">
                      <button className="aws-btn aws-btn-primary text-xs" onClick={() => {
                        dispatch({
                          type: 'UPDATE_FUNCTION_CONFIG',
                          payload: {
                            name: func.name,
                            description: editDescription,
                            memorySize: editMemory,
                            timeout: editTimeout
                          }
                        });
                        addFlash('success', 'General configuration saved');
                      }}>Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {configTab === 'Triggers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Triggers</h3>
                  <button className="aws-btn aws-btn-primary text-xs flex items-center gap-1" onClick={() => setTriggerForm({ type: 'S3', source: '', event: 's3:ObjectCreated:*' })}>
                    <Plus size={14} /> Add trigger
                  </button>
                </div>
                <table className="aws-table">
                  <thead><tr><th>Source</th><th>ARN / Details</th><th>Status</th></tr></thead>
                  <tbody>
                    {triggersList.map((t, i) => (
                      <tr key={i}>
                        <td className="font-medium text-sm">{t.source}</td>
                        <td className="text-xs font-mono text-aws-text-secondary truncate max-w-xs">{t.arn}</td>
                        <td><span className="aws-badge bg-aws-status-success-bg text-aws-success text-xs">{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {configTab === 'Permissions' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Execution role</h3>
                <div className="aws-card">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-aws-text-secondary">Role name:</span> <span className="ml-2 text-aws-blue font-medium">LambdaExecutionRole</span></div>
                    <div><span className="text-aws-text-secondary">Role ARN:</span> <span className="ml-2 font-mono text-xs">{func.role}</span></div>
                  </div>
                </div>
                <h3 className="font-bold text-sm mt-4">Resource-based policy statements</h3>
                <div className="text-sm text-aws-text-secondary">No resource-based policy statements configured.</div>
              </div>
            )}

            {configTab === 'Environment variables' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Environment variables</h3>
                <table className="aws-table">
                  <thead><tr><th>Key</th><th>Value</th><th className="w-12"></th></tr></thead>
                  <tbody>
                    {envVars.map((ev, i) => (
                      <tr key={i}>
                        <td className="font-mono text-sm">{ev.key}</td>
                        <td className="font-mono text-sm">{ev.value}</td>
                        <td>
                          <button className="text-aws-error hover:text-aws-error" onClick={() => {
                            const newVars = envVars.filter((_, idx) => idx !== i);
                            setEnvVars(newVars);
                          }}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                    {envVars.length === 0 && (
                      <tr><td colSpan="3" className="text-center text-aws-text-secondary text-sm py-4">No environment variables</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="flex items-center gap-2">
                  <input className="aws-input w-40" placeholder="Key" value={newEnvKey} onChange={e => setNewEnvKey(e.target.value)} />
                  <input className="aws-input w-48" placeholder="Value" value={newEnvVal} onChange={e => setNewEnvVal(e.target.value)} />
                  <button className="aws-btn aws-btn-secondary text-xs" disabled={!newEnvKey.trim()} onClick={() => {
                    if (!newEnvKey.trim()) return;
                    setEnvVars([...envVars, { key: newEnvKey.trim(), value: newEnvVal }]);
                    setNewEnvKey('');
                    setNewEnvVal('');
                  }}>Add</button>
                </div>
                <button className="aws-btn aws-btn-primary text-xs" onClick={() => {
                  const envObj = {};
                  envVars.forEach(ev => { envObj[ev.key] = ev.value; });
                  dispatch({ type: 'UPDATE_FUNCTION_ENVIRONMENT', payload: { name: func.name, environment: envObj } });
                  addFlash('success', 'Environment variables saved');
                }}>Save</button>
              </div>
            )}

            {configTab === 'Tags' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Tags</h3>
                <table className="aws-table">
                  <thead><tr><th>Key</th><th>Value</th></tr></thead>
                  <tbody>
                    {Object.entries(func.tags || {}).map(([k, v]) => (
                      <tr key={k}>
                        <td className="text-sm">{k}</td>
                        <td className="text-sm">{v}</td>
                      </tr>
                    ))}
                    {Object.keys(func.tags || {}).length === 0 && (
                      <tr><td colSpan="2" className="text-center text-aws-text-secondary text-sm py-4">No tags</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Monitor' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="aws-card"><div className="text-xs text-aws-text-secondary">Invocations</div><div className="text-2xl font-bold mt-1">1,284</div></div>
            <div className="aws-card"><div className="text-xs text-aws-text-secondary">Errors</div><div className="text-2xl font-bold mt-1">3</div></div>
            <div className="aws-card"><div className="text-xs text-aws-text-secondary">Duration p95</div><div className="text-2xl font-bold mt-1">48 ms</div></div>
            <div className="aws-card"><div className="text-xs text-aws-text-secondary">Throttles</div><div className="text-2xl font-bold mt-1">0</div></div>
          </div>
          <div className="aws-card">
            <h3 className="font-bold text-sm mb-3">Invocation trend</h3>
            <div className="h-32 flex items-end gap-2">
              {[34, 52, 45, 70, 62, 88, 76, 93, 81, 67].map((height, idx) => (
                <div key={idx} className="bg-aws-orange w-8" style={{ height }} title={`${height} invocations`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Aliases' && (
        <div className="aws-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Aliases ({aliases.length})</h3>
            <button className="aws-btn aws-btn-secondary text-xs"
              onClick={() => setAliasForm({ name: '', version: versions[0]?.version || '$LATEST', description: '' })}>
              Create alias
            </button>
          </div>
          <table className="aws-table">
            <thead><tr><th>Name</th><th>Version</th><th>Description</th><th /></tr></thead>
            <tbody>
              {aliases.map(a => (
                <tr key={a.name}>
                  <td className="font-medium">{a.name}</td>
                  <td className="font-mono text-sm">{a.version}</td>
                  <td>{a.description || '–'}</td>
                  <td>
                    <button className="aws-btn aws-btn-secondary text-xs"
                      onClick={() => {
                        dispatch({ type: 'RESOURCE_DELETE', payload: { path: 'lambdaAliases', key: 'name', id: a.name } });
                        addFlash('success', `Deleted alias ${a.name}`);
                      }}>Delete</button>
                  </td>
                </tr>
              ))}
              {aliases.length === 0 && <tr><td colSpan="4" className="text-center py-6 text-aws-text-secondary">This function has no aliases.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Versions' && (
        <div className="aws-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Versions ({versions.length})</h3>
            <button className="aws-btn aws-btn-secondary text-xs"
              onClick={() => setVersionForm({ description: '' })}>Publish new version</button>
          </div>
          <table className="aws-table">
            <thead><tr><th>Version</th><th>Description</th><th>Published</th><th>Runtime</th><th>Code size</th></tr></thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.version}>
                  <td className="font-mono text-sm">{v.version}</td>
                  <td>{v.description || '–'}</td>
                  <td>{v.published || <span className="text-aws-text-secondary">Not published</span>}</td>
                  <td>{func.runtime}</td>
                  <td>{func.codeSize} bytes</td>
                </tr>
              ))}
              {versions.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-aws-text-secondary">No versions published.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {triggerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Add trigger</h3>
              <button onClick={() => setTriggerForm(null)} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={addTrigger} className="p-4 space-y-4 text-sm">
              <div>
                <label className="block font-bold mb-1" htmlFor="trig-type">Source</label>
                <select id="trig-type" className="aws-input" value={triggerForm.type}
                  onChange={e => setTriggerForm({ ...triggerForm, type: e.target.value,
                    event: e.target.value === 'S3' ? 's3:ObjectCreated:*'
                         : e.target.value === 'SQS' ? 'ReceiveMessage'
                         : e.target.value === 'SNS' ? 'Publish'
                         : 'rate(1 day)' })}>
                  {['S3', 'SQS', 'SNS', 'EventBridge'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1" htmlFor="trig-source">
                  {triggerForm.type === 'S3' ? 'Bucket' : triggerForm.type === 'SQS' ? 'Queue'
                    : triggerForm.type === 'SNS' ? 'Topic' : 'Rule name'}
                </label>
                <input id="trig-source" className="aws-input" value={triggerForm.source} required
                  onChange={e => setTriggerForm({ ...triggerForm, source: e.target.value })} />
              </div>
              <div>
                <label className="block font-bold mb-1" htmlFor="trig-event">Event</label>
                <input id="trig-event" className="aws-input font-mono" value={triggerForm.event} required
                  onChange={e => setTriggerForm({ ...triggerForm, event: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setTriggerForm(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aliasForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create alias</h3>
              <button onClick={() => setAliasForm(null)} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={createAlias} className="p-4 space-y-4 text-sm">
              <div>
                <label className="block font-bold mb-1" htmlFor="alias-name">Name</label>
                <input id="alias-name" className="aws-input" value={aliasForm.name} required
                  onChange={e => setAliasForm({ ...aliasForm, name: e.target.value })} placeholder="prod" />
              </div>
              <div>
                <label className="block font-bold mb-1" htmlFor="alias-version">Version</label>
                <select id="alias-version" className="aws-input" value={aliasForm.version}
                  onChange={e => setAliasForm({ ...aliasForm, version: e.target.value })}>
                  {versions.map(v => <option key={v.version} value={v.version}>{v.version}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1" htmlFor="alias-desc">Description <span className="font-normal text-aws-text-secondary">- optional</span></label>
                <input id="alias-desc" className="aws-input" value={aliasForm.description}
                  onChange={e => setAliasForm({ ...aliasForm, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setAliasForm(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create alias</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {versionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Publish new version</h3>
              <button onClick={() => setVersionForm(null)} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={publishVersion} className="p-4 space-y-4 text-sm">
              <p className="text-aws-text-secondary">
                Publishing snapshots the current $LATEST code as an immutable numbered version.
              </p>
              <div>
                <label className="block font-bold mb-1" htmlFor="version-desc">Version description <span className="font-normal text-aws-text-secondary">- optional</span></label>
                <input id="version-desc" className="aws-input" value={versionForm.description}
                  onChange={e => setVersionForm({ ...versionForm, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setVersionForm(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
