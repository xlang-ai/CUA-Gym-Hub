import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { Play, Save, Trash2, Star, Clock, X, Database } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_SQL = 'SELECT table_name, table_rows FROM information_schema.tables ORDER BY table_rows DESC LIMIT 10;';

// Deterministic mock query engine: no live database, just recognizable canned
// results so the editor "runs" queries without a real backend.
function mockRunQuery(sql, db) {
  const trimmed = sql.trim().replace(/;$/, '');
  const lower = trimmed.toLowerCase();
  if (!trimmed) {
    return { status: 'Failed', error: 'ERROR: empty query', columns: [], rows: [], durationMs: 4 };
  }
  if (!lower.startsWith('select') && !lower.startsWith('show')) {
    return { status: 'Failed', error: `ERROR: only read-only SELECT/SHOW statements are supported in this preview`, columns: [], rows: [], durationMs: 12 };
  }
  if (lower.includes('from orders') && db.engine === 'mysql') {
    return { status: 'Failed', error: `ERROR 1146 (42S02): Table '${db.id}.orders' doesn't exist`, columns: [], rows: [], durationMs: 38 };
  }
  if (lower.includes('information_schema.tables') || lower.includes('show tables')) {
    return {
      status: 'Completed', error: '',
      columns: ['table_name', 'table_rows'],
      rows: [
        { table_name: 'users', table_rows: 15420 },
        { table_name: 'orders', table_rows: 245000 },
        { table_name: 'sessions', table_rows: 3200 },
      ],
      durationMs: 176,
    };
  }
  if (lower.includes('count(*)') || lower.includes('group by')) {
    return {
      status: 'Completed', error: '',
      columns: ['group_key', 'count'],
      rows: [
        { group_key: 'pending', count: 812 },
        { group_key: 'shipped', count: 5120 },
        { group_key: 'delivered', count: 22040 },
      ],
      durationMs: 244,
    };
  }
  return {
    status: 'Completed', error: '',
    columns: ['result'],
    rows: [{ result: `Query executed against ${db.id} (${db.engine} ${db.engineVersion})` }],
    durationMs: 96,
  };
}

export default function RDSQueryEditor() {
  const { state, dispatch, addFlash } = useStore();
  const databases = state.rds || [];
  const history = state.rdsQueryHistory || [];
  const [dbInstanceId, setDbInstanceId] = useState(databases[0]?.id || '');
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [lastRunId, setLastRunId] = useState(history[0]?.id || null);
  const [saveModalId, setSaveModalId] = useState(null);
  const [saveName, setSaveName] = useState('');

  const db = databases.find(d => d.id === dbInstanceId) || databases[0];
  const lastRun = history.find(h => h.id === lastRunId);
  const savedQueries = useMemo(() => history.filter(h => h.saved), [history]);

  const handleRun = () => {
    if (!db) { addFlash('error', 'Select a DB instance first.'); return; }
    const result = mockRunQuery(sql, db);
    const id = `qh-${Date.now()}`;
    const entry = {
      id, dbInstanceId: db.id, database: db.engine === 'postgres' ? 'postgres' : 'information_schema',
      sql, status: result.status, ranAt: new Date().toISOString(), durationMs: result.durationMs,
      rowCount: result.rows.length, error: result.error, saved: false, name: '',
      resultColumns: result.columns, resultPreview: result.rows,
    };
    dispatch({ type: 'RUN_RDS_QUERY', payload: entry });
    setLastRunId(id);
    if (result.status === 'Completed') addFlash('success', `Query completed in ${result.durationMs}ms, ${result.rows.length} row(s) returned.`);
    else addFlash('error', `Query failed: ${result.error}`);
  };

  const openSaveModal = (entry) => { setSaveModalId(entry.id); setSaveName(entry.name || ''); };

  const handleSave = (e) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    dispatch({ type: 'SAVE_RDS_QUERY', payload: { id: saveModalId, name: saveName.trim() } });
    addFlash('success', `Query saved as "${saveName.trim()}".`);
    setSaveModalId(null);
    setSaveName('');
  };

  const handleDeleteHistory = (entry) => {
    dispatch({ type: 'DELETE_RDS_QUERY', payload: entry.id });
    addFlash('success', 'Query removed from history.');
    if (lastRunId === entry.id) setLastRunId(null);
  };

  const loadQuery = (entry) => {
    setSql(entry.sql);
    setDbInstanceId(entry.dbInstanceId);
    setLastRunId(entry.id);
  };

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Query Editor</h1>
          <p className="aws-page-header-description">Run SQL queries against your RDS databases directly from the console without a separate SQL client.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 space-y-4">
          <div className="aws-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-aws-text-secondary" />
                <select className="aws-input w-auto" value={dbInstanceId} onChange={e => setDbInstanceId(e.target.value)}>
                  {databases.map(d => <option key={d.id} value={d.id}>{d.id} ({d.engine} {d.engineVersion})</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button className="aws-btn aws-btn-primary text-xs flex items-center gap-1" onClick={handleRun} disabled={!db}>
                  <Play size={14} /> Run
                </button>
              </div>
            </div>
            <textarea
              className="aws-input font-mono text-sm"
              style={{ minHeight: 140, resize: 'vertical' }}
              value={sql}
              onChange={e => setSql(e.target.value)}
              placeholder="SELECT * FROM my_table LIMIT 10;"
            />
          </div>

          <div className="aws-card p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
              <h2 className="font-bold text-sm">Results {lastRun ? `(${lastRun.rowCount} row${lastRun.rowCount === 1 ? '' : 's'})` : ''}</h2>
              {lastRun && lastRun.status === 'Completed' && (
                <button className="aws-btn aws-btn-secondary text-xs flex items-center gap-1" onClick={() => openSaveModal(lastRun)}>
                  <Save size={12} /> Save query
                </button>
              )}
            </div>
            {!lastRun && <div className="text-center py-8 text-aws-text-secondary text-sm">Run a query to see results here.</div>}
            {lastRun && lastRun.status === 'Failed' && (
              <div className="p-4">
                <div className="aws-alert aws-alert-error">{lastRun.error}</div>
              </div>
            )}
            {lastRun && lastRun.status === 'Completed' && (
              <table className="aws-table">
                <thead><tr>{(lastRun.resultColumns || []).map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {(lastRun.resultPreview || []).map((row, i) => (
                    <tr key={i}>{(lastRun.resultColumns || []).map(c => <td key={c} className="font-mono text-sm">{String(row[c])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-2 flex items-center gap-1"><Star size={14} /> Saved queries</h2>
            {savedQueries.length === 0 && <p className="text-xs text-aws-text-secondary">No saved queries yet. Run a query and save it to reuse later.</p>}
            <div className="space-y-2">
              {savedQueries.map(q => (
                <div key={q.id} className="border border-aws-border rounded-aws-input p-2 cursor-pointer hover:bg-aws-blue-light" onClick={() => loadQuery(q)}>
                  <div className="text-sm font-bold text-aws-blue">{q.name}</div>
                  <div className="text-xs text-aws-text-secondary font-mono truncate">{q.sql}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="aws-card">
            <h2 className="font-bold text-sm mb-2 flex items-center gap-1"><Clock size={14} /> History</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className={`border rounded-aws-input p-2 ${lastRunId === h.id ? 'border-aws-blue bg-aws-blue-light' : 'border-aws-border'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`aws-badge ${h.status === 'Completed' ? 'aws-badge-success' : 'aws-badge-error'} text-[10px]`}>{h.status}</span>
                    <div className="flex items-center gap-2">
                      <button className="text-aws-blue text-xs hover:underline" onClick={() => loadQuery(h)}>Load</button>
                      <button className="text-aws-error text-xs hover:underline" onClick={() => handleDeleteHistory(h)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="text-xs text-aws-text-secondary font-mono truncate mt-1">{h.sql}</div>
                  <div className="text-[10px] text-aws-text-disabled mt-1">{h.dbInstanceId} &middot; {format(new Date(h.ranAt), 'MMM d, h:mm a')}</div>
                </div>
              ))}
              {history.length === 0 && <p className="text-xs text-aws-text-secondary">No query history yet.</p>}
            </div>
          </div>
        </div>
      </div>

      {saveModalId && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-sm">
            <div className="aws-modal-header">
              <h3>Save query</h3>
              <button onClick={() => setSaveModalId(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="aws-modal-body">
                <div className="aws-form-group">
                  <label className="aws-form-label">Query name *</label>
                  <input className="aws-input" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Daily event counts" required autoFocus />
                </div>
              </div>
              <div className="aws-modal-footer">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setSaveModalId(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary" disabled={!saveName.trim()}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
