import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import ResourceDetail, { FieldGrid, TagTable } from '../components/ResourceDetail';
import { RESOURCES } from '../lib/resourceRegistry';

/**
 * Renders any resource's detail page from its registry entry.
 *
 * One component rather than fifty pages, for the same reason `ActionsMenu` and `usePaged`
 * are shared: the console's second layer is the same shape everywhere, and fifty
 * near-identical files is how the earlier bulk edits went wrong.
 *
 * A tab renders a field grid, a table over related rows, or the tag table. There is no
 * fourth kind and no placeholder kind — a tab exists in the registry only when there is
 * something real to put in it.
 */

/** Walk a dotted path such as `vpc.subnets` or a top-level key such as `volumes`. */
function at(state, path) {
  return path.split('.').reduce((n, k) => (n ? n[k] : undefined), state) || [];
}

function Cell({ row, spec }) {
  const [, field, format] = spec;
  const v = row[field];
  if (format) return <>{format(v)}</>;
  if (v === null || v === undefined || v === '') return <span className="text-aws-text-secondary">–</span>;
  if (Array.isArray(v)) return <>{v.join(', ')}</>;
  if (typeof v === 'boolean') return <>{v ? 'Yes' : 'No'}</>;
  return <>{String(v)}</>;
}

function TabTable({ rows, columns, empty }) {
  if (!rows.length) {
    return <p className="text-sm text-aws-text-secondary">{empty || 'No entries.'}</p>;
  }
  return (
    <table className="aws-table">
      <thead><tr>{columns.map((c) => <th key={c[0]}>{c[0]}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id || row.name || i}>
            {columns.map((c) => <td key={c[0]}><Cell row={row} spec={c} /></td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ResourceDetailPage({ resourceId }) {
  const { state } = useStore();
  const params = useParams();
  const spec = RESOURCES.find((r) => r.id === resourceId);
  const id = params.id;

  if (!spec) {
    return <div className="aws-card p-6 text-sm">Unknown resource type.</div>;
  }

  const collection = at(state, spec.path);
  const resource = collection.find((r) => String(r[spec.key]) === String(id));

  if (!resource) {
    return (
      <ResourceDetail
        notFound
        backTo={spec.listRoute}
        backLabel={spec.listLabel}
        notFoundMessage={`No ${spec.id} with identifier ${id} exists. It may have been deleted.`}
      />
    );
  }

  const summary = spec.summary.map((f) => ({
    label: f.label,
    value: f.format ? f.format(resource[f.field]) : resource[f.field],
    mono: f.mono,
    link: f.link ? f.link(resource) : undefined,
  }));

  const tabs = spec.tabs.map((t) => ({
    label: t.label,
    render: () => {
      if (t.tags) return <TagTable tags={resource.tags} />;
      if (t.fields) {
        return <FieldGrid fields={t.fields.map((f) => ({
          label: f.label,
          value: f.format ? f.format(resource[f.field]) : resource[f.field],
          mono: f.mono,
        }))} />;
      }
      const rows = t.related
        ? at(state, t.related.path).filter((row) => t.related.match(row, resource))
        : (t.rows ? t.rows(resource) : []);
      return <TabTable rows={rows} columns={t.columns || []} empty={t.empty} />;
    },
  }));

  return (
    <ResourceDetail
      title={resource[spec.titleField] || resource[spec.key]}
      subtitle={resource[spec.key] !== resource[spec.titleField] ? resource[spec.key] : undefined}
      backTo={spec.listRoute}
      backLabel={spec.listLabel}
      summary={summary}
      tabs={tabs}
    />
  );
}
