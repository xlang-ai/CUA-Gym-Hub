import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import ActionsMenu from '../components/ActionsMenu';
import LastUpdated from '../components/LastUpdated';
import { Search, Settings, X } from 'lucide-react';

// Instance type finder fields, from the live console (reference/capture/extracted/
// ec2-instance-types.2026-08-18.json). Only the DEFAULT value of each select was captured —
// the selects were not expanded — so the first entry of each list is sourced and the rest are
// inferred from the field's evident purpose. Marked here rather than passed off as captured.
const FINDER_FIELDS = [
  { key: 'workload', label: 'Workload type', options: ['Web/App Server', 'Database', 'Analytics', 'Machine learning', 'General purpose'] },
  { key: 'useCase', label: 'Use case', options: ['Web Hosting', 'Content management', 'Data warehousing', 'Model training', 'Batch processing'] },
  { key: 'priority', label: 'Priority', options: ['Price/Performance', 'Lowest price', 'Highest performance'] },
  { key: 'cpu', label: 'CPU manufacturer', options: ['No preference', 'Intel', 'AMD', 'XWS Graviton'] },
];
const FINDER_DEFAULTS = { workload: 'Web/App Server', useCase: 'Web Hosting', priority: 'Price/Performance', cpu: 'No preference' };

// Split-panel tabs, captured verbatim from the console.
const PANEL_TABS = ['Details', 'Compute', 'Networking', 'Storage', 'Accelerators', 'Pricing'];

// What each split-panel tab shows. Every tab resolves to real fields — an accelerator-free
// type reports "None" rather than rendering an empty panel, which is what the console does
// and is not the same thing as a tab that was never implemented.
//
// Pricing is DERIVED, not random: the same instance type always yields the same figure, so a
// task whose check reads a price stays reproducible across runs.
const hourly = (t) => (t.vcpus * 0.0425 + t.memory * 0.0055).toFixed(4);
const proc = (t) => (t.arch === 'arm64' ? 'XWS Graviton' : t.type.includes('a.') || t.type.startsWith('m5a') ? 'AMD EPYC' : 'Intel Xeon');
const PANEL_FIELDS = {
  Details: (t) => [
    { label: 'Instance type', value: t.type },
    { label: 'Free tier eligible', value: t.freeTier ? 'Yes' : 'No' },
    { label: 'Current generation', value: /^(t2|m5a|i2)/.test(t.type) ? 'No' : 'Yes' },
    { label: 'Architecture', value: t.arch },
    { label: 'Hypervisor', value: /^(t2|i2)/.test(t.type) ? 'xen' : 'nitro' },
    { label: 'Instance family', value: t.type.split('.')[0] },
  ],
  Compute: (t) => [
    { label: 'vCPUs', value: t.vcpus },
    { label: 'Memory (GiB)', value: t.memory },
    { label: 'Memory per vCPU (GiB)', value: (t.memory / t.vcpus).toFixed(2) },
    { label: 'Processor', value: proc(t) },
    { label: 'Burstable performance', value: t.type.startsWith('t') ? 'Yes' : 'No' },
  ],
  Networking: (t) => [
    { label: 'Network performance', value: t.network },
    { label: 'ENA support', value: /^(t2|i2)/.test(t.type) ? 'Not supported' : 'Supported' },
    { label: 'IPv6 support', value: 'Supported' },
    { label: 'Maximum network interfaces', value: Math.min(15, Math.max(2, Math.floor(t.vcpus / 2) + 1)) },
  ],
  Storage: (t) => [
    { label: 'Instance store (GB)', value: t.storage === '-' ? 'EBS only' : t.storage },
    { label: 'Instance store type', value: t.storageType === '-' ? '–' : t.storageType },
    { label: 'EBS optimized', value: /^(t2|i2)/.test(t.type) ? 'Not by default' : 'Yes, by default' },
    { label: 'Root device types', value: 'ebs' },
  ],
  Accelerators: (t) => [
    { label: 'GPUs', value: 'None' },
    { label: 'GPU memory (GiB)', value: '–' },
    { label: 'Inference accelerators', value: 'None' },
    { label: 'Note', value: 'This instance family does not include accelerators.' },
  ],
  Pricing: (t) => [
    { label: 'On-Demand hourly rate', value: `$${hourly(t)}` },
    { label: 'On-Demand monthly (730 h)', value: `$${(hourly(t) * 730).toFixed(2)}` },
    { label: 'Per vCPU hourly', value: `$${(hourly(t) / t.vcpus).toFixed(4)}` },
    { label: 'Free tier eligible', value: t.freeTier ? 'Yes' : 'No' },
  ],
};

const INSTANCE_TYPES = [
  { type: 'm8g.24xlarge', freeTier: false, vcpus: 96, arch: 'arm64', memory: 384, storage: '-', storageType: '-', network: '40 Gigabit' },
  { type: 'm5a.4xlarge', freeTier: false, vcpus: 16, arch: 'x86_64', memory: 64, storage: '-', storageType: '-', network: 'Up to 10 Gigabit' },
  { type: 'm8i.12xlarge', freeTier: false, vcpus: 48, arch: 'x86_64', memory: 192, storage: '-', storageType: '-', network: '22.5 Gigabit' },
  { type: 'm5zn.2xlarge', freeTier: false, vcpus: 8, arch: 'x86_64', memory: 32, storage: '-', storageType: '-', network: 'Up to 25 Gigabit' },
  { type: 'i2.2xlarge', freeTier: false, vcpus: 8, arch: 'x86_64', memory: 61, storage: 1600, storageType: 'ssd', network: 'High' },
  { type: 'm6id.xlarge', freeTier: false, vcpus: 4, arch: 'x86_64', memory: 16, storage: 237, storageType: 'ssd', network: 'Up to 12.5 Gigabit' },
  { type: 't2.micro', freeTier: true, vcpus: 1, arch: 'x86_64', memory: 1, storage: '-', storageType: '-', network: 'Low to Moderate' },
  { type: 't3.micro', freeTier: true, vcpus: 2, arch: 'x86_64', memory: 1, storage: '-', storageType: '-', network: 'Low to Moderate' },
  { type: 't3.small', freeTier: false, vcpus: 2, arch: 'x86_64', memory: 2, storage: '-', storageType: '-', network: 'Low to Moderate' },
  { type: 't3.medium', freeTier: false, vcpus: 2, arch: 'x86_64', memory: 4, storage: '-', storageType: '-', network: 'Low to Moderate' },
  { type: 'm5.large', freeTier: false, vcpus: 2, arch: 'x86_64', memory: 8, storage: '-', storageType: '-', network: 'Up to 10 Gbps' },
  { type: 'm5.xlarge', freeTier: false, vcpus: 4, arch: 'x86_64', memory: 16, storage: '-', storageType: '-', network: 'Up to 10 Gbps' },
  { type: 'c5.large', freeTier: false, vcpus: 2, arch: 'x86_64', memory: 4, storage: '-', storageType: '-', network: 'Up to 10 Gbps' },
  { type: 'c5.xlarge', freeTier: false, vcpus: 4, arch: 'x86_64', memory: 8, storage: '-', storageType: '-', network: 'Up to 10 Gbps' },
  { type: 'r5.large', freeTier: false, vcpus: 2, arch: 'x86_64', memory: 16, storage: '-', storageType: '-', network: 'Up to 10 Gbps' },
  { type: 'r5.xlarge', freeTier: false, vcpus: 4, arch: 'x86_64', memory: 32, storage: '-', storageType: '-', network: 'Up to 10 Gbps' },
];

export default function EC2InstanceTypes() {
  const { dispatch, addFlash } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [panelTab, setPanelTab] = useState('Details');
  const [panelOpen, setPanelOpen] = useState(true);
  const [showFinder, setShowFinder] = useState(false);
  const [finder, setFinder] = useState(FINDER_DEFAULTS);
  const [advice, setAdvice] = useState(null);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // "Get instance type advice" narrows the table, so the finder is a filter with a result,
  // not a form that closes and leaves the page exactly as it was.
  const adviceMatch = (t) => {
    if (!advice) return true;
    if (advice.cpu === 'XWS Graviton' && t.arch !== 'arm64') return false;
    if ((advice.cpu === 'Intel' || advice.cpu === 'AMD') && t.arch !== 'x86_64') return false;
    if (advice.workload === 'Database' && t.memory / t.vcpus < 4) return false;
    if (advice.workload === 'Analytics' && t.vcpus < 4) return false;
    if (advice.workload === 'Machine learning' && t.vcpus < 8) return false;
    if (advice.priority === 'Lowest price' && t.vcpus > 4) return false;
    if (advice.priority === 'Highest performance' && t.vcpus < 8) return false;
    return true;
  };

  const filtered = INSTANCE_TYPES.filter(t =>
    (!search || t.type.toLowerCase().includes(search.toLowerCase())) && adviceMatch(t)
  );
  const selected = INSTANCE_TYPES.filter((t) => selectedTypes.includes(t.type));
  const one = selected.length === 1 ? selected[0] : null;

  const downloadListCsv = () => {
    const header = ['Instance type', 'Free tier eligible', 'vCPUs', 'Architecture', 'Memory (GiB)', 'Storage (GB)', 'Storage type', 'Network performance'];
    const body = filtered.map((t) => [t.type, t.freeTier, t.vcpus, t.arch, t.memory, t.storage, t.storageType, t.network]);
    const csv = [header, ...body].map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    const filename = 'instance-types.csv';
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { /* sandboxes may block the download; the recorded export still stands */ }
    dispatch({ type: 'RECORD_EXPORT', payload: { kind: 'instance-types-csv', filename, rows: filtered.length, bytes: csv.length } });
    addFlash('success', `Exported ${filtered.length} instance types to ${filename}`);
  };

  // Captured verbatim: Launch instance, Create launch template, Download list CSV.
  const actions = [
    { label: 'Launch instance', disabled: !one, reason: 'Select exactly one instance type',
      onSelect: () => navigate(`/ec2?launch=${encodeURIComponent(one.type)}`) },
    { label: 'Create launch template', disabled: !one, reason: 'Select exactly one instance type',
      onSelect: () => navigate(`/ec2/launch-templates?create=${encodeURIComponent(one.type)}`) },
    { label: 'Download list CSV', onSelect: downloadListCsv },
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-0">
      <div className="aws-card p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">
            Instance types ({selectedTypes.length > 0 ? `${selectedTypes.length}/${filtered.length}` : filtered.length})
          </h1>
          <div className="flex items-center gap-2">
            <LastUpdated />
            <button className="aws-btn aws-btn-secondary text-xs" onClick={() => setShowFinder(true)}>Instance type finder</button>
            <ActionsMenu items={actions} />
          </div>
        </div>

        {advice && (
          <div className="px-4 py-2 border-b border-aws-border-secondary bg-aws-status-info-bg/40 flex items-center justify-between gap-4 text-sm">
            <span>
              Advice applied — <b>{advice.workload}</b> · {advice.useCase} · {advice.priority} · {advice.cpu}.
              Showing {filtered.length} of {INSTANCE_TYPES.length} instance types.
            </span>
            <button className="aws-btn aws-btn-secondary text-xs whitespace-nowrap" onClick={() => { setAdvice(null); setPage(1); }}>Clear advice</button>
          </div>
        )}
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Find instance type by attribute" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-xs text-aws-text-secondary ml-auto">
            <button className="px-2 py-0.5 border border-aws-border rounded hover:bg-aws-status-info-bg/30" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lt;</button>
            <span>{page} of {totalPages}</span>
            <button className="px-2 py-0.5 border border-aws-border rounded hover:bg-aws-status-info-bg/30" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&gt;</button>
            <button className="p-1.5 hover:bg-aws-disabled-bg rounded"><Settings size={14} className="text-aws-text-secondary" /></button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="aws-table">
            <thead>
              <tr>
                <th className="w-8"><input type="checkbox" /></th>
                <th>
                  <span className="flex items-center gap-1">
                    Instance type
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-aws-text-secondary"><path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </span>
                </th>
                <th>
                  <span className="flex items-center gap-1">
                    Free ...
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-aws-text-secondary"><path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </span>
                </th>
                <th>
                  <span className="flex items-center gap-1">
                    vCPUs
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-aws-text-secondary"><path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </span>
                </th>
                <th>Architecture</th>
                <th>Memory (GiB)</th>
                <th>Storage (GB)</th>
                <th>Storage type</th>
                <th>Network performance</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => (
                <tr key={t.type} className={selectedTypes.includes(t.type) ? 'bg-aws-status-info-bg/50' : ''}>
                  <td>
                    <input type="checkbox" checked={selectedTypes.includes(t.type)} onChange={e => {
                      if (e.target.checked) setSelectedTypes([...selectedTypes, t.type]);
                      else setSelectedTypes(selectedTypes.filter(x => x !== t.type));
                    }} />
                  </td>
                  <td className="text-aws-blue hover:underline cursor-pointer font-medium">{t.type}</td>
                  <td>{t.freeTier ? 'true' : 'false'}</td>
                  <td>{t.vcpus}</td>
                  <td>{t.arch}</td>
                  <td>{t.memory}</td>
                  <td>{t.storage}</td>
                  <td>{t.storageType}</td>
                  <td>{t.network}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Split panel. The console shows the selected resource here; the placeholder text
            "Select an instance type" and the six tab names are captured verbatim. */}
        <div className="border-t border-aws-border">
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-aws-disabled-bg/40"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className={`text-aws-text-secondary transition-transform ${panelOpen ? '' : '-rotate-90'}`}>
              <path d="M3 5 L6 8 L9 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {one ? `Instance type: ${one.type}` : 'Select an instance type'}
          </button>
          {panelOpen && (
            one ? (
              <div>
                <div className="flex border-b border-aws-border overflow-x-auto px-2" role="tablist">
                  {PANEL_TABS.map((t) => (
                    <button key={t} role="tab" aria-selected={panelTab === t}
                      className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${panelTab === t ? 'border-aws-blue text-aws-blue font-bold' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`}
                      onClick={() => setPanelTab(t)}>{t}</button>
                  ))}
                </div>
                <div className="p-4 text-sm" role="tabpanel">
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                    {PANEL_FIELDS[panelTab](one).map((f) => (
                      <div key={f.label}>
                        <dt className="text-xs font-bold text-aws-text-secondary mb-1">{f.label}</dt>
                        <dd className="text-sm">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : (
              <p className="px-4 pb-4 text-sm text-aws-text-secondary">
                Select an instance type above to see its details.
              </p>
            )
          )}
        </div>
      </div>

      {showFinder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-xl border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Instance type finder</h3>
              <button onClick={() => setShowFinder(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form
              className="p-4 space-y-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                setAdvice(finder);
                setPage(1);
                setShowFinder(false);
              }}
            >
              <h4 className="font-bold">Instance type requirements</h4>
              {FINDER_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block font-bold mb-1" htmlFor={`finder-${f.key}`}>{f.label}</label>
                  <select
                    id={`finder-${f.key}`}
                    className="aws-input"
                    value={finder[f.key]}
                    onChange={(e) => setFinder({ ...finder, [f.key]: e.target.value })}
                  >
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowFinder(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Get instance type advice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
