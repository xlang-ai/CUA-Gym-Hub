import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExternalLink, X, AlertCircle } from 'lucide-react';

export default function BillingDashboard() {
  const { state, dispatch, addFlash } = useStore();
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', title: '', threshold: '100' });

  // Both of these were "simulated in mock mode" toasts. The completeness guide asks for a local
  // analog rather than fake feedback, and a recorded contact or monitor is something a task can
  // actually check afterwards.
  const submitDialog = (e) => {
    e.preventDefault();
    if (dialog === 'contact') {
      dispatch({ type: 'ADD_BILLING_CONTACT', payload: {
        name: form.name, email: form.email, title: form.title || 'Billing', type: 'Alternate' } });
      addFlash('success', `Added ${form.email} as an alternate billing contact`);
    } else {
      dispatch({ type: 'CREATE_ANOMALY_MONITOR', payload: {
        id: `monitor-${Math.random().toString(16).substr(2, 10)}`,
        name: form.name, type: 'XWS services', threshold: Number(form.threshold) || 100,
        status: 'Active' } });
      addFlash('success', `Created anomaly monitor ${form.name}`);
    }
    setForm({ name: '', email: '', title: '', threshold: '100' });
    setDialog(null);
  };
  const { billing } = state;
  const costChange = billing.currentMonth - billing.lastMonth;
  const costPct = billing.lastMonth > 0 ? ((costChange / billing.lastMonth) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Billing and Cost Management home <span className="text-aws-blue text-xs font-normal ml-1 cursor-pointer hover:underline">Info</span>
        </h1>
        <div className="flex items-center gap-2">
          <button className="aws-btn aws-btn-secondary text-xs">Provide feedback</button>
          <button className="aws-btn aws-btn-secondary text-xs flex items-center gap-1">Need Help? Ask Q <svg width="10" height="10" viewBox="0 0 10 10" className="text-aws-text-secondary"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>
          <button className="aws-btn aws-btn-link text-xs">Reset layout</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: Cost summary + Cost breakdown */}
        <div className="col-span-2 space-y-6">
          {/* Cost summary */}
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-1">
              Cost summary <span className="text-aws-blue text-xs font-normal ml-1 cursor-pointer hover:underline">Info</span>
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-aws-text-secondary mb-1">Month-to-date cost</div>
                <div className="text-3xl font-bold">${billing.currentMonth.toFixed(2)}</div>
                <div className={`text-xs mt-1 ${costChange >= 0 ? 'text-aws-error' : 'text-aws-success'}`}>
                  {costChange >= 0 ? '▲' : '▼'} {Math.abs(costPct)}% compared to last month for same period
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-aws-text-secondary">Last month's cost for same time period</div>
                  <div className="text-xl font-bold">${(billing.lastMonth * 0.3).toFixed(2)}</div>
                  <div className="text-xs text-aws-text-disabled">Feb 1-7</div>
                </div>
              </div>
            </div>
            <div className="border-t border-aws-border-secondary mt-4 pt-3">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-aws-text-secondary">Total forecasted cost for current month</div>
                  <div className="text-xl font-bold">${billing.forecast.toFixed(2)}</div>
                  <div className="text-xs text-aws-text-disabled">▲ {((billing.forecast / billing.lastMonth - 1) * 100).toFixed(0)}% compared to last month's total costs</div>
                </div>
                <div>
                  <div className="text-xs text-aws-text-secondary">Last month's total cost</div>
                  <div className="text-xl font-bold">${billing.lastMonth.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2">
              <Link to="/billing/bills" className="text-sm text-aws-blue hover:underline flex items-center gap-1">
                View bill <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="aws-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm flex items-center gap-1">
                Cost breakdown <span className="text-aws-blue text-xs font-normal ml-1 cursor-pointer hover:underline">Info</span>
              </h2>
              <ExternalLink size={14} className="text-aws-text-secondary cursor-pointer" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-aws-text-secondary">Group costs by</span>
              <select className="aws-input w-auto text-sm" defaultValue="Service">
                <option>Service</option>
                <option>Region</option>
              </select>
            </div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billing.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={v => `$${v.toFixed(2)}`} />
                  <Bar dataKey="amount" fill="#0972D3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {billing.byService.slice(0, 5).map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: s.color }}></span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Cost monitor + Recommended actions */}
        <div className="space-y-6">
          {/* Cost monitor */}
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-1">
              Cost monitor <span className="text-aws-blue text-xs font-normal ml-1 cursor-pointer hover:underline">Info</span>
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-aws-text-secondary">Budgets status</div>
                {billing.budgets && billing.budgets.length > 0 ? (
                  billing.budgets.map((b, i) => {
                    const pct = b.limit > 0 ? ((billing.currentMonth / b.limit) * 100).toFixed(0) : 0;
                    const isOver = billing.currentMonth > b.limit;
                    return (
                      <div key={i}>
                        <div className={`text-sm font-medium flex items-center gap-1 ${isOver ? 'text-aws-error' : 'text-aws-success'}`}>
                          <AlertCircle size={14} className={isOver ? 'text-aws-error' : 'text-aws-success'} />
                          {isOver ? `Over budget` : 'On track'}
                        </div>
                        <div className="text-xs text-aws-text-secondary mt-0.5">
                          {b.name}: ${billing.currentMonth.toLocaleString()} / ${b.limit.toLocaleString()} ({pct}%)
                        </div>
                        <div className="w-full bg-aws-disabled-bg h-2 rounded-full mt-1">
                          <div className={`h-2 rounded-full ${isOver ? 'bg-aws-error' : 'bg-aws-success'}`} style={{ width: `${Math.min(Number(pct), 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="text-sm text-aws-blue hover:underline cursor-pointer flex items-center gap-1">
                      <AlertCircle size={14} className="text-aws-orange" /> Setup required
                    </div>
                    <div className="text-xs text-aws-text-disabled mt-0.5">No budgets created</div>
                  </>
                )}
              </div>
              <div>
                <div className="text-sm text-aws-text-secondary">Cost anomalies status (MTD)</div>
                <div className="text-sm text-aws-blue hover:underline cursor-pointer flex items-center gap-1">
                  <AlertCircle size={14} className="text-aws-orange" /> Setup required
                </div>
                <div className="text-xs text-aws-text-disabled mt-0.5">No monitor created</div>
              </div>
            </div>
          </div>

          {/* Recommended actions */}
          <div className="aws-card">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-1">
              Recommended actions (3) <span className="text-aws-blue text-xs font-normal ml-1 cursor-pointer hover:underline">Info</span>
            </h2>
            <div className="space-y-3">
              <RecommendedAction
                icon="📧"
                title="Add alternate billing contact"
                desc="Add an additional billing contact."
                action="Update billing contact"
                onAction={() => setDialog('contact')}
              />
              <RecommendedAction
                icon="🔍"
                title="Create an anomaly monitor"
                desc="Create a Cost Anomaly monitor to automatically detect cost anomalies."
                action="Create a monitor"
                onAction={() => setDialog('monitor')}
              />
              <RecommendedAction
                icon="💰"
                title="Enable Cost Optimization Hub"
                desc="Opt in to start generating saving opportunity recommendations."
                action="Opt in"
                onAction={() => addFlash('success', 'Cost Optimization Hub enabled (simulated)')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Services Table */}
      <div className="aws-card">
        <h3 className="font-bold text-sm mb-4">Top services</h3>
        <table className="aws-table">
          <thead><tr><th>Service</th><th>Month-to-date cost</th><th>% of total</th><th></th></tr></thead>
          <tbody>
            {billing.byService.map(s => (
              <tr key={s.name}>
                <td className="font-medium">{s.name}</td>
                <td>${s.amount.toFixed(2)}</td>
                <td>{s.percentage}%</td>
                <td className="w-40">
                  <div className="w-full bg-aws-disabled-bg h-2 rounded-full">
                    <div className="h-2 rounded-full" style={{ width: `${s.percentage}%`, backgroundColor: s.color }}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Free Tier Usage */}
      <div className="aws-card">
        <h3 className="font-bold text-sm mb-4">Free Tier usage</h3>
        <table className="aws-table">
          <thead><tr><th>Service</th><th>Usage type</th><th>Monthly limit</th><th>Current usage</th><th>Usage %</th></tr></thead>
          <tbody>
            {billing.freeTier.map(f => (
              <tr key={f.service + f.usageType} className={f.percentage >= 100 ? 'bg-aws-status-error-bg' : f.percentage >= 80 ? 'bg-aws-status-warning-bg' : ''}>
                <td>{f.service}</td>
                <td className="text-xs text-aws-text-secondary">{f.usageType}</td>
                <td>{f.limit}</td>
                <td>{typeof f.used === 'number' ? f.used.toLocaleString() : f.used}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-aws-disabled-bg h-2 rounded-full">
                      <div className={`h-2 rounded-full ${f.percentage >= 100 ? 'bg-aws-error' : f.percentage >= 80 ? 'bg-aws-warning' : 'bg-aws-success'}`} style={{ width: `${Math.min(f.percentage, 100)}%` }}></div>
                    </div>
                    <span className={`text-xs font-medium ${f.percentage >= 100 ? 'text-aws-error' : f.percentage >= 80 ? 'text-aws-warning' : ''}`}>{f.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">{dialog === 'contact' ? 'Add alternate billing contact' : 'Create anomaly monitor'}</h3>
              <button onClick={() => setDialog(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={submitDialog} className="p-4 space-y-4 text-sm">
              <div>
                <label className="block font-bold mb-1" htmlFor="bd-name">
                  {dialog === 'contact' ? 'Full name' : 'Monitor name'}
                </label>
                <input id="bd-name" className="aws-input" value={form.name} required
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              {dialog === 'contact' ? (
                <>
                  <div>
                    <label className="block font-bold mb-1" htmlFor="bd-email">Email address</label>
                    <input id="bd-email" type="email" className="aws-input" value={form.email} required
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block font-bold mb-1" htmlFor="bd-title">Title <span className="font-normal text-aws-text-secondary">- optional</span></label>
                    <input id="bd-title" className="aws-input" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-bold mb-1" htmlFor="bd-threshold">Alert threshold (USD)</label>
                  <input id="bd-threshold" type="number" min="1" className="aws-input" value={form.threshold} required
                    onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
                  <p className="text-aws-text-secondary text-xs mt-1">Raise an alert when detected spend anomalies exceed this amount.</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">
                  {dialog === 'contact' ? 'Add contact' : 'Create monitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendedAction({ icon, title, desc, action, onAction }) {
  return (
    <div className="flex items-start gap-3 p-3 border border-aws-border rounded-lg">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-aws-text-secondary mt-0.5">
          {desc} <span className="text-aws-blue hover:underline cursor-pointer" onClick={onAction}>{action}</span>
        </div>
      </div>
      <button className="text-aws-text-disabled hover:text-aws-text flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
