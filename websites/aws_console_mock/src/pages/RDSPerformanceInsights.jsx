import React, { useState, useEffect, useMemo } from 'react';
import { downloadAndRecord, toCsv } from '../lib/exportFile';
import LastUpdated from '../components/LastUpdated';
import { useStore } from '../store/StoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {Download, Activity} from 'lucide-react';

// Cloudscape design tokens aren't exposed as CSS custom properties in this app,
// so chart series colors are resolved at runtime from the Tailwind utility
// classes themselves (never hardcoded hex) via a throwaway DOM probe.
function useTailwindColors(classNames) {
  const key = classNames.join('|');
  const [colors, setColors] = useState(() => classNames.map(() => 'rgb(120,120,120)'));
  useEffect(() => {
    const resolved = classNames.map(cls => {
      const el = document.createElement('span');
      el.className = cls;
      el.style.position = 'absolute';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
      const c = getComputedStyle(el).color;
      document.body.removeChild(el);
      return c || 'rgb(120,120,120)';
    });
    setColors(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return colors;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// Pure deterministic pseudo-random in [0, 1), seeded by instance + index.
// No Math.random / Date.now involved so the chart is stable across renders.
function seeded(seed, i) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const VCPU_BY_CLASS = {
  'db.t3.micro': 2, 'db.t3.small': 2, 'db.t3.medium': 2,
  'db.r6g.large': 2, 'db.r6g.xlarge': 4, 'db.m5.large': 2, 'db.m5.xlarge': 4,
};

const MYSQL_QUERIES = [
  'SELECT * FROM orders WHERE customer_id = ?',
  'UPDATE sessions SET last_seen = ? WHERE id = ?',
  'SELECT COUNT(*) FROM users WHERE created_at > ?',
  'INSERT INTO audit_log (event, payload) VALUES (?, ?)',
];
const POSTGRES_QUERIES = [
  'SELECT * FROM events WHERE created_at > $1 ORDER BY created_at DESC',
  'UPDATE inventory SET quantity = quantity - $1 WHERE sku = $2',
  'SELECT date_trunc(\'hour\', created_at), count(*) FROM events GROUP BY 1',
  'INSERT INTO analytics_rollup (metric, value) VALUES ($1, $2)',
];

const POINTS = 24;

function buildLoadSeries(db) {
  const seed = hashString(db.id);
  const vcpu = VCPU_BY_CLASS[db.class] || 2;
  const points = [];
  for (let i = 0; i < POINTS; i++) {
    const wave = (Math.sin(i / 3.2 + seed % 7) + 1) / 2; // 0..1 smooth wave
    const noise = seeded(seed, i) * 0.35;
    const base = (wave * 0.6 + noise) * vcpu * 0.9;
    const cpu = Math.max(0.02, base * (0.45 + seeded(seed, i + 100) * 0.15));
    const io = Math.max(0.01, base * (0.25 + seeded(seed, i + 200) * 0.1));
    const lock = Math.max(0, base * (0.08 + seeded(seed, i + 300) * 0.08));
    const other = Math.max(0.01, base * (0.15 + seeded(seed, i + 400) * 0.1));
    points.push({
      label: `-${(POINTS - 1 - i) * 5}m`,
      CPU: +cpu.toFixed(2), IO: +io.toFixed(2), Lock: +lock.toFixed(2), Other: +other.toFixed(2),
      total: +(cpu + io + lock + other).toFixed(2),
    });
  }
  return { points, vcpu };
}

function buildTopSql(db) {
  const seed = hashString(db.id);
  const queries = db.engine === 'postgres' ? POSTGRES_QUERIES : MYSQL_QUERIES;
  let remaining = 100;
  return queries.map((sql, i) => {
    const share = i === queries.length - 1 ? remaining : Math.round(remaining * (0.2 + seeded(seed, i + 500) * 0.35));
    remaining -= share;
    const avgLatencyMs = Math.round(2 + seeded(seed, i + 600) * 48);
    const calls = Math.round(50 + seeded(seed, i + 700) * 4500);
    return { sql, loadPct: Math.max(1, share), avgLatencyMs, calls };
  });
}

const WAIT_STATE_COLOR_CLASSES = ['text-aws-blue', 'text-aws-success', 'text-aws-warning', 'text-aws-text-secondary'];

export default function RDSPerformanceInsights() {
  const { state, dispatch, addFlash } = useStore();
  const databases = state.rds || [];
  const [dbInstanceId, setDbInstanceId] = useState(databases[0]?.id || '');
  const db = databases.find(d => d.id === dbInstanceId) || databases[0];
  const colors = useTailwindColors(WAIT_STATE_COLOR_CLASSES);

  const { points, vcpu } = useMemo(() => (db ? buildLoadSeries(db) : { points: [], vcpu: 2 }), [db?.id]);
  const topSql = useMemo(() => (db ? buildTopSql(db) : []), [db?.id]);
  const currentLoad = points.length ? points[points.length - 1].total : 0;

  if (!db) {
    return (
      <div className="aws-page-header"><h1>Performance Insights</h1><p className="aws-page-header-description">No DB instances available.</p></div>
    );
  }

  const handleExport = () => {
    const rows = (state.rdsQueryHistory || []).map((q) => [q.dbInstanceId, q.database, q.status, q.ranAt, (q.sql || '').slice(0, 120)]);
    downloadAndRecord({
      dispatch, addFlash, kind: 'performance-insights-csv', filename: 'performance-insights.csv',
      content: toCsv(['DB instance', 'Database', 'Status', 'Ran at', 'SQL'], rows), rows: rows.length,
    });
  };

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Performance Insights</h1>
          <p className="aws-page-header-description">Monitor database load, top SQL statements, and wait states for your RDS instances. Read-only view derived from live instance data.</p>
        </div>
        <div className="flex items-center gap-2">
          <LastUpdated />
          <button className="aws-btn aws-btn-secondary text-xs flex items-center gap-1" onClick={handleExport}>
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>

      <div className="aws-card mb-4 flex items-center gap-4">
        <Activity size={18} className="text-aws-text-secondary" />
        <select className="aws-input w-auto" value={dbInstanceId} onChange={e => setDbInstanceId(e.target.value)}>
          {databases.map(d => <option key={d.id} value={d.id}>{d.id} ({d.engine} {d.engineVersion})</option>)}
        </select>
        <div className="ml-auto grid grid-cols-3 gap-8 text-sm">
          <div><div className="text-aws-text-secondary text-xs">Current DB load</div><div className="text-xl font-bold">{currentLoad.toFixed(2)} AAS</div></div>
          <div><div className="text-aws-text-secondary text-xs">Max recommended</div><div className="text-xl font-bold">{vcpu.toFixed(2)} AAS</div></div>
          <div><div className="text-aws-text-secondary text-xs">Instance class</div><div className="text-xl font-bold">{db.class}</div></div>
        </div>
      </div>

      <div className="aws-card" style={{ height: 320 }}>
        <h2 className="font-bold text-sm mb-2">DB load (average active sessions, by wait state)</h2>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={points}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => `${Number(v).toFixed(2)} AAS`} />
            <Legend />
            <Area type="monotone" dataKey="CPU" stackId="1" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
            <Area type="monotone" dataKey="IO" stackId="1" stroke={colors[1]} fill={colors[1]} fillOpacity={0.6} />
            <Area type="monotone" dataKey="Lock" stackId="1" stroke={colors[2]} fill={colors[2]} fillOpacity={0.6} />
            <Area type="monotone" dataKey="Other" stackId="1" stroke={colors[3]} fill={colors[3]} fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="aws-card p-0">
          <div className="px-4 py-3 border-b border-aws-border"><h2 className="font-bold text-sm">Top SQL by load</h2></div>
          <table className="aws-table">
            <thead><tr><th>Query</th><th>Load %</th><th>Avg latency</th><th>Calls</th></tr></thead>
            <tbody>
              {topSql.map((q, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs max-w-xs truncate" title={q.sql}>{q.sql}</td>
                  <td>{q.loadPct}%</td>
                  <td>{q.avgLatencyMs} ms</td>
                  <td>{q.calls.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="aws-card p-0">
          <div className="px-4 py-3 border-b border-aws-border"><h2 className="font-bold text-sm">Wait states (current)</h2></div>
          <table className="aws-table">
            <thead><tr><th>Wait state</th><th>AAS</th><th>Share</th></tr></thead>
            <tbody>
              {points.length > 0 && ['CPU', 'IO', 'Lock', 'Other'].map((k, i) => {
                const last = points[points.length - 1];
                const pct = currentLoad > 0 ? ((last[k] / currentLoad) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={k}>
                    <td className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors[i] }} />{k}</td>
                    <td>{last[k].toFixed(2)}</td>
                    <td>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
