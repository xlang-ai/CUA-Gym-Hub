import React, { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import { X } from 'lucide-react';

/**
 * "Create flow log" — offered on VPCs, subnets and network interfaces alike, which is why it
 * lives here rather than in one page.
 *
 * Field names and choices follow the VPC User Guide "Create a flow log" procedure, which names
 * each control and its options verbatim.
 */
const FILTERS = [{ value: 'ALL', label: 'All' }, { value: 'ACCEPT', label: 'Accept' }, { value: 'REJECT', label: 'Reject' }];
const INTERVALS = [{ value: 60, label: '1 minute' }, { value: 600, label: '10 minutes' }];
const DESTINATIONS = [
  { value: 'cloud-watch-logs', label: 'Send to CloudWatch Logs' },
  { value: 's3', label: 'Send to an XWS S3 bucket' },
  { value: 'kinesis-data-firehose', label: 'Send to XWS Data Firehose in the same account' },
];

export default function FlowLogDialog({ resourceId, onClose }) {
  const { dispatch, addFlash } = useStore();
  const [f, setF] = useState({
    name: '', filter: 'ALL', interval: 600, destination: 'cloud-watch-logs',
    destinationArn: '/aws/vpc/flowlogs', customFormat: false,
    format: '${version} ${account-id} ${interface-id}',
  });

  const submit = (e) => {
    e.preventDefault();
    const id = `fl-${Math.random().toString(16).substr(2, 17)}`;
    dispatch({ type: 'CREATE_VPC_FLOW_LOG', payload: {
      id, name: f.name, resourceId, filter: f.filter,
      maxAggregationInterval: f.interval, destinationType: f.destination,
      destination: f.destinationArn,
      logFormat: f.customFormat ? f.format : 'XWS default format',
      status: 'Active',
    }});
    addFlash('success', `Flow log ${id} created for ${resourceId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white shadow-xl w-full max-w-xl border border-aws-border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
          <h3 className="font-bold">Create flow log</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-4 text-sm">
          <p className="text-aws-text-secondary">Resource: <span className="font-mono">{resourceId}</span></p>
          <div>
            <label className="block font-bold mb-1" htmlFor="fl-name">Name <span className="font-normal text-aws-text-secondary">- optional</span></label>
            <input id="fl-name" className="aws-input" value={f.name} placeholder="my-flow-log"
              onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <span className="block font-bold mb-1">Filter</span>
            {FILTERS.map((x) => (
              <label key={x.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="fl-filter" checked={f.filter === x.value}
                  onChange={() => setF({ ...f, filter: x.value })} />
                <span>{x.label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block font-bold mb-1" htmlFor="fl-interval">Maximum aggregation interval</label>
            <select id="fl-interval" className="aws-input" value={f.interval}
              onChange={(e) => setF({ ...f, interval: Number(e.target.value) })}>
              {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>
          <div>
            <span className="block font-bold mb-1">Destination</span>
            {DESTINATIONS.map((d) => (
              <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="fl-dest" checked={f.destination === d.value}
                  onChange={() => setF({ ...f, destination: d.value,
                    destinationArn: d.value === 's3' ? 's3://my-flow-logs-bucket' : '/aws/vpc/flowlogs' })} />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block font-bold mb-1" htmlFor="fl-arn">
              {f.destination === 's3' ? 'S3 bucket ARN' : 'Destination log group'}
            </label>
            <input id="fl-arn" className="aws-input font-mono" value={f.destinationArn} required
              onChange={(e) => setF({ ...f, destinationArn: e.target.value })} />
          </div>
          <div>
            <span className="block font-bold mb-1">Log record format</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="fl-format" checked={!f.customFormat}
                onChange={() => setF({ ...f, customFormat: false })} />
              <span>XWS default format</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="fl-format" checked={f.customFormat}
                onChange={() => setF({ ...f, customFormat: true })} />
              <span>Custom format</span>
            </label>
            {f.customFormat && (
              <textarea className="aws-input font-mono mt-2" rows={3} value={f.format}
                onChange={(e) => setF({ ...f, format: e.target.value })} />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="aws-btn aws-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="aws-btn aws-btn-primary">Create flow log</button>
          </div>
        </form>
      </div>
    </div>
  );
}
