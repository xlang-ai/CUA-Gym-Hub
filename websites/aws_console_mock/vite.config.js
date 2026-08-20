import { secureMockApiPlugin } from '../../shared/secureMockApiPlugin.mjs';
import { defineConfig } from 'vite'
import { getDefaultData } from './src/store/dataManager.js'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const STATE_DIR = path.join(process.cwd(), '.mock-states')
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
}

function getStateFile(sid) {
  if (!sid) return path.join(process.cwd(), '.mock-state.json')
  const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '')
  return path.join(STATE_DIR, `${safeSid}.json`)
}

function readState(sid) {
  try {
    const file = getStateFile(sid)
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (e) { console.error('Error reading state:', e) }
  return null
}

function writeState(sid, state) {
  try { fs.writeFileSync(getStateFile(sid), JSON.stringify(state, null, 2)); return true } catch (e) { return false }
}

function writeInitialStateIfMissing(sid, state) {
  try {
    const file = getInitialStateFile(sid)
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(state, null, 2))
    return true
  } catch (e) { return false }
}

function clearState(sid) {
  try { const file = getStateFile(sid); if (fs.existsSync(file)) fs.unlinkSync(file) } catch (e) { /* ignore */ }
  try { const initFile = getInitialStateFile(sid); if (fs.existsSync(initFile)) fs.unlinkSync(initFile) } catch (e) { /* ignore */ }
  return true
}

function getInitialStateFile(sid) {
  if (!sid) return path.join(process.cwd(), '.mock-state.initial.json')
  const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '')
  return path.join(STATE_DIR, `${safeSid}.initial.json`)
}

function readInitialState(sid) {
  try {
    const file = getInitialStateFile(sid)
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (e) { console.error('Error reading initial state:', e) }
  return null
}

/**
 * Transient UI state that must never reach state_diff.
 *
 * `flash` holds toast messages that auto-dismiss on a 5s timer, so including it makes
 * the diff depend on *when* the reward function polls /go, and every single action
 * appends an entry. A reward function asserting "only the expected key changed" would
 * fail on timing alone. These keys stay in current_state (the shape is unchanged) —
 * they are only excluded from the derived diff.
 */
const EPHEMERAL_STATE_KEYS = new Set(['flash'])

function calculateStateDiff(initial, current) {
  const diff = {}
  for (const key in current) {
    if (EPHEMERAL_STATE_KEYS.has(key)) continue
    if (!initial || JSON.stringify(current[key]) !== JSON.stringify(initial[key])) {
      if (!diff[key]) diff[key] = {}
      if (!initial || !initial[key]) {
        diff[key].added = current[key]
      } else {
        diff[key].modified = current[key]
      }
    }
  }
  return Object.keys(diff).length > 0 ? diff : {}
}

function deepMerge(target, source) {
  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * Server-side twin of `deepMergeWithDefaults` in src/store/dataManager.js.
 *
 * The client fills a task's partial injected state against getDefaultData() before
 * rendering, then POSTs the fully-populated object back via `set_current`. If the
 * server stores the *partial* object as `.initial.json`, `/go` ends up diffing a
 * 2-key baseline against a 32-key current state and reports ~31 fabricated "added"
 * entries before the agent has done anything — silently corrupting every reward
 * function that reads state_diff.
 *
 * Normalizing here keeps both sides on the same baseline. Semantics must stay
 * byte-identical to the client version:
 *   - defaults supply only keys the task omitted; task values always win
 *   - explicit null/undefined in the task payload is skipped (default is kept)
 *   - arrays are replaced wholesale, never merged element-wise
 *   - keys the defaults do not know about are preserved as-is
 */
function deepMergeWithDefaults(defaults, custom) {
  if (!custom) return defaults
  const result = { ...defaults }
  for (const key in custom) {
    if (custom[key] !== null && custom[key] !== undefined) {
      if (
        typeof custom[key] === 'object' && !Array.isArray(custom[key]) &&
        typeof defaults[key] === 'object' && !Array.isArray(defaults[key])
      ) {
        result[key] = deepMergeWithDefaults(defaults[key], custom[key])
      } else {
        result[key] = custom[key]
      }
    }
  }
  return result
}

function normalizeInjectedState(state) {
  return deepMergeWithDefaults(getDefaultData(), state || {})
}

function parseQuery(url) {
  const idx = url.indexOf('?')
  if (idx === -1) return {}
  const params = {}
  url.substring(idx + 1).split('&').forEach(pair => {
    const [k, v] = pair.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '')
  })
  return params
}


// Files directory for uploaded attachments
const FILES_DIR = path.join(process.cwd(), '.mock-files')
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true })
}

function getFilesDir(sid) {
  const safeSid = (sid || '_default').replace(/[^a-zA-Z0-9_-]/g, '')
  const dir = path.join(FILES_DIR, safeSid)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function parseMultipart(buf, boundary) {
  const files = []
  const boundaryBuf = Buffer.from('--' + boundary)
  const parts = []
  let start = 0
  while (true) {
    const idx = buf.indexOf(boundaryBuf, start)
    if (idx === -1) break
    if (start > 0) {
      let partStart = start
      let partEnd = idx - 2
      if (partEnd > partStart) parts.push(buf.slice(partStart, partEnd))
    }
    start = idx + boundaryBuf.length + 2
  }
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headerStr = part.slice(0, headerEnd).toString('utf-8')
    const body = part.slice(headerEnd + 4)
    const nameMatch = headerStr.match(/name="([^"]*)"/)
    const filenameMatch = headerStr.match(/filename="([^"]*)"/)
    const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i)
    if (filenameMatch && filenameMatch[1]) {
      files.push({ fieldName: nameMatch ? nameMatch[1] : 'file', filename: filenameMatch[1], contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream', data: body })
    }
  }
  return files
}

export default defineConfig({
  plugins: [secureMockApiPlugin({ ephemeralKeys: ['flash'] }), 
    react(),
    {
      name: 'mock-api',
      configureServer(server) {
        // POST /upload - Upload attachment files
        server.middlewares.use('/upload', async (req, res, next) => {
          if (req.method !== 'POST') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          const contentType = req.headers['content-type'] || ''
          const boundaryMatch = contentType.match(/boundary=(.+)/)
          if (!boundaryMatch) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Content-Type must be multipart/form-data' })); return }
          const chunks = []; for await (const chunk of req) chunks.push(chunk)
          const buf = Buffer.concat(chunks)
          const files = parseMultipart(buf, boundaryMatch[1])
          if (files.length === 0) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'No files found' })); return }
          const filesDir = getFilesDir(sid)
          const uploaded = []
          for (const file of files) {
            const safeFilename = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
            const storedName = `${randomUUID().slice(0, 8)}_${safeFilename}`
            fs.writeFileSync(path.join(filesDir, storedName), file.data)
            const safeSid = (sid || '_default').replace(/[^a-zA-Z0-9_-]/g, '')
            uploaded.push({ original_name: file.filename, stored_name: storedName, size: file.data.length, content_type: file.contentType, url: `/files/${safeSid}/${storedName}` })
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, files: uploaded }))
        })

        // GET /files/:sid/:filename - Serve uploaded files
        server.middlewares.use('/files', (req, res, next) => {
          if (req.method !== 'GET') return next()
          const parts = (req.url || '').split('/').filter(Boolean)
          if (parts.length < 2) { res.statusCode = 404; res.end('Not found'); return }
          const sid = parts[0].replace(/[^a-zA-Z0-9_-]/g, '')
          const filename = parts.slice(1).join('/').replace(/[^a-zA-Z0-9._-]/g, '_')
          const filePath = path.join(FILES_DIR, sid, filename)
          if (!fs.existsSync(filePath)) { res.statusCode = 404; res.end('File not found'); return }
          const ext = path.extname(filename).toLowerCase()
          const mimeMap = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
          const ct = mimeMap[ext] || 'application/octet-stream'
          const fileData = fs.readFileSync(filePath)
          res.setHeader('Content-Type', ct)
          res.setHeader('Content-Length', fileData.length)
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
          res.end(fileData)
        })


        server.middlewares.use('/post', async (req, res, next) => {
          if (req.method !== 'POST') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          let body = ''
          for await (const chunk of req) { body += chunk }
          try {
            const data = JSON.parse(body)
            const action = data.action || 'set'
            if (action === 'reset') {
              clearState(sid)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'State reset.' }))
              return
            }
            if (action === 'set') {
              const currentState = readState(sid) || {}
              const injected = data.merge ? deepMerge(currentState, data.state) : data.state
              // Fill defaults for keys the task omitted so that .initial.json and the
              // state the client will compute share one baseline (see normalizeInjectedState).
              const newState = normalizeInjectedState(injected)
              writeInitialStateIfMissing(sid, currentState && Object.keys(currentState).length ? currentState : newState)
              writeState(sid, newState)
              if (!readInitialState(sid)) {
                try {
                  const initFile = getInitialStateFile(sid)
                  fs.writeFileSync(initFile, JSON.stringify(newState, null, 2))
                } catch (e) {
                  console.error('Error writing initial state file:', e)
                }
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'State updated.', state: newState }))
              return
            }
            if (action === 'set_current') {
              // Updates ONLY current_state (.json). Never touches .initial.json.
              // Used by golden_patch.py to simulate correct task completion.
              const currentState = readState(sid) || {}
              const newState = data.merge
                ? deepMerge(currentState, data.state)
                : data.state
              writeState(sid, newState)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'Current state updated. Initial state preserved.', state: newState }))
              return
            }

            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Unknown action' }))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })
        server.middlewares.use('/state', (req, res, next) => {
          if (req.method !== 'GET') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          const state = readState(sid)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({ stored_state: state, has_custom_state: state !== null, sid }))
        })
        server.middlewares.use('/go', (req, res, next) => {
          if (req.method !== 'GET') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          const currentState = readState(sid)
          const initialState = readInitialState(sid)
          const defaultData = getDefaultData()
          const initial = initialState || currentState || defaultData
          const current = currentState || initial
          const stateDiff = calculateStateDiff(initial, current)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({
            initial_state: initial,
            current_state: current,
            state_diff: stateDiff
          }))
        })
      },
      configurePreviewServer(server) {
        // POST /upload - Upload attachment files
        server.middlewares.use('/upload', async (req, res, next) => {
          if (req.method !== 'POST') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          const contentType = req.headers['content-type'] || ''
          const boundaryMatch = contentType.match(/boundary=(.+)/)
          if (!boundaryMatch) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Content-Type must be multipart/form-data' })); return }
          const chunks = []; for await (const chunk of req) chunks.push(chunk)
          const buf = Buffer.concat(chunks)
          const files = parseMultipart(buf, boundaryMatch[1])
          if (files.length === 0) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'No files found' })); return }
          const filesDir = getFilesDir(sid)
          const uploaded = []
          for (const file of files) {
            const safeFilename = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
            const storedName = `${randomUUID().slice(0, 8)}_${safeFilename}`
            fs.writeFileSync(path.join(filesDir, storedName), file.data)
            const safeSid = (sid || '_default').replace(/[^a-zA-Z0-9_-]/g, '')
            uploaded.push({ original_name: file.filename, stored_name: storedName, size: file.data.length, content_type: file.contentType, url: `/files/${safeSid}/${storedName}` })
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, files: uploaded }))
        })

        // GET /files/:sid/:filename - Serve uploaded files
        server.middlewares.use('/files', (req, res, next) => {
          if (req.method !== 'GET') return next()
          const parts = (req.url || '').split('/').filter(Boolean)
          if (parts.length < 2) { res.statusCode = 404; res.end('Not found'); return }
          const sid = parts[0].replace(/[^a-zA-Z0-9_-]/g, '')
          const filename = parts.slice(1).join('/').replace(/[^a-zA-Z0-9._-]/g, '_')
          const filePath = path.join(FILES_DIR, sid, filename)
          if (!fs.existsSync(filePath)) { res.statusCode = 404; res.end('File not found'); return }
          const ext = path.extname(filename).toLowerCase()
          const mimeMap = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
          const ct = mimeMap[ext] || 'application/octet-stream'
          const fileData = fs.readFileSync(filePath)
          res.setHeader('Content-Type', ct)
          res.setHeader('Content-Length', fileData.length)
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
          res.end(fileData)
        })


        server.middlewares.use('/post', async (req, res, next) => {
          if (req.method !== 'POST') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          let body = ''
          for await (const chunk of req) { body += chunk }
          try {
            const data = JSON.parse(body)
            const action = data.action || 'set'
            if (action === 'reset') {
              clearState(sid)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'State reset.' }))
              return
            }
            if (action === 'set') {
              const currentState = readState(sid) || {}
              const injected = data.merge ? deepMerge(currentState, data.state) : data.state
              // Same normalization as the dev-server handler above.
              const newState = normalizeInjectedState(injected)
              writeState(sid, newState)
              if (!readInitialState(sid)) {
                try {
                  const initFile = getInitialStateFile(sid)
                  fs.writeFileSync(initFile, JSON.stringify(newState, null, 2))
                } catch (e) {
                  console.error('Error writing initial state file:', e)
                }
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'State updated.', state: newState }))
              return
            }
            if (action === 'set_current') {
              // Updates ONLY current_state (.json). Never touches .initial.json.
              // Used by golden_patch.py to simulate correct task completion.
              const currentState = readState(sid) || {}
              const newState = data.merge
                ? deepMerge(currentState, data.state)
                : data.state
              writeInitialStateIfMissing(sid, readInitialState(sid) || (currentState && Object.keys(currentState).length ? currentState : newState))
              writeState(sid, newState)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'Current state updated. Initial state preserved.', state: newState }))
              return
            }

            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Unknown action' }))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })
        server.middlewares.use('/state', (req, res, next) => {
          if (req.method !== 'GET') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          const state = readState(sid)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({ stored_state: state, has_custom_state: state !== null, sid }))
        })
        server.middlewares.use('/go', (req, res, next) => {
          if (req.method !== 'GET') return next()
          const query = parseQuery(req.url || '')
          const sid = query.sid || null
          const currentState = readState(sid)
          const initialState = readInitialState(sid)
          const defaultData = getDefaultData()
          const initial = initialState || currentState || defaultData
          const current = currentState || initial
          const stateDiff = calculateStateDiff(initial, current)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({
            initial_state: initial,
            current_state: current,
            state_diff: stateDiff
          }))
        })
      }
    }
  ],
  server: {
    host: true,
    allowedHosts: true
  },
  // `host: true` binds dual-stack. With '0.0.0.0' the preview server is IPv4-only, so any
  // harness whose client resolves localhost to ::1 (Node's fetch does) gets ECONNREFUSED
  // while curl silently succeeds by falling back to IPv4 — an intermittent-looking failure
  // that is actually deterministic per client.
  preview: { port: 0, host: true, allowedHosts: true }
})
