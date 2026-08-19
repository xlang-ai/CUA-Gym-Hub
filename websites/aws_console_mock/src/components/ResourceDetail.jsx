import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * The second layer of the console: what a user gets after clicking a row.
 *
 * Measured before this existed: 58 pages carried a populated table and only 12 of them had
 * rows that led anywhere. The console was one layer deep almost everywhere, because the
 * fidelity reference modelled it as flat — it declared columns and actions per list route
 * and had no notion of a detail page at all. What the instrument cannot see does not get
 * built, so the fix is a spec dimension plus this one shared template, not 46 bespoke pages.
 *
 *   <ResourceDetail
 *     title={vpc.name} subtitle={vpc.id}
 *     backTo="/vpc/vpcs" backLabel="Your VPCs"
 *     actions={<ActionsMenu items={...} />}
 *     summary={[{ label: 'VPC ID', value: vpc.id, mono: true }, ...]}
 *     tabs={[{ label: 'Details', render: () => <FieldGrid fields={...} /> }]}
 *   />
 *
 * `notFound` renders the console's own missing-resource state rather than crashing, which
 * matters because task harnesses inject state and can navigate to an id that no longer
 * exists after the agent deletes it.
 */
export function FieldGrid({ fields, columns = 3 }) {
  return (
    <dl className={`grid gap-x-8 gap-y-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`}>
      {fields.map((f) => (
        <div key={f.label}>
          <dt className="text-xs font-bold text-aws-text-secondary mb-1">{f.label}</dt>
          <dd className={`text-sm ${f.mono ? 'font-mono' : ''} ${f.link ? 'text-aws-blue' : ''}`}>
            {f.link ? <Link to={f.link} className="hover:underline">{f.value}</Link>
              : (f.value === '' || f.value === null || f.value === undefined ? '–' : f.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TagTable({ tags = [] }) {
  if (!tags.length) {
    return <p className="text-sm text-aws-text-secondary">No tags associated with this resource.</p>;
  }
  return (
    <table className="aws-table">
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>
        {tags.map((t, i) => (
          <tr key={`${t.Key}-${i}`}><td className="font-medium">{t.Key}</td><td>{t.Value || '–'}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ResourceDetail({
  title, subtitle, backTo, backLabel, actions, summary = [], tabs = [], notFound = false,
  notFoundMessage = 'The resource you requested no longer exists.',
}) {
  const [active, setActive] = useState(0);

  if (notFound) {
    return (
      <div>
        <nav className="flex items-center gap-1 text-sm text-aws-text-secondary mb-4">
          <Link to={backTo} className="text-aws-blue hover:underline">{backLabel}</Link>
        </nav>
        <h1 className="font-bold text-2xl mb-2">Resource not found</h1>
        <div className="aws-card p-6 text-sm text-aws-text-secondary">{notFoundMessage}</div>
      </div>
    );
  }

  const tab = tabs[Math.min(active, Math.max(tabs.length - 1, 0))];

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-aws-text-secondary mb-3">
        <Link to={backTo} className="text-aws-blue hover:underline">{backLabel}</Link>
        <ChevronRight size={13} />
        <span className="font-mono">{subtitle || title}</span>
      </nav>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-bold text-2xl">{title}</h1>
          {subtitle && <p className="font-mono text-sm text-aws-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {summary.length > 0 && (
        <div className="aws-card p-0 mb-4">
          <div className="px-4 py-3 border-b border-aws-border">
            <h2 className="font-bold text-lg">Summary</h2>
          </div>
          <div className="p-4"><FieldGrid fields={summary} /></div>
        </div>
      )}

      {tabs.length > 0 && (
        <div className="aws-card p-0">
          <div className="flex border-b border-aws-border overflow-x-auto" role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                role="tab"
                aria-selected={i === active}
                className={
                  'px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px ' +
                  (i === active
                    ? 'border-b-2 border-aws-blue text-aws-blue font-bold'
                    : 'border-b-2 border-transparent text-aws-text-secondary hover:text-aws-text')
                }
                onClick={() => setActive(i)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4" role="tabpanel">{tab ? tab.render() : null}</div>
        </div>
      )}
    </div>
  );
}
