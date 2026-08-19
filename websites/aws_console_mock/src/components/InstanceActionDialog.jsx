import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

/**
 * One dialog per Actions item, driven by the descriptors in src/lib/instanceActions.js.
 *
 * Every kind renders something real. A dialog that appears and does nothing is the defect
 * this codebase keeps finding: it looks like the feature shipped, and an agent that opens it
 * learns the action succeeded. So `connect` prints the actual SSH command built from this
 * instance's key pair and address, `diagnostics` really inspects the store, and `systemLog`
 * is derived deterministically from the instance so the same instance always shows the same
 * boot log.
 */

const DEV = /^[0-9a-f]+$/i;
function seeded(id) {
  // Deterministic per instance: the same instance must produce the same log every time,
  // or a task that reads it cannot be verified.
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
}

function systemLogFor(inst) {
  const rnd = seeded(inst.id);
  const t = (n) => (n + rnd() * 0.4).toFixed(6).padStart(11, ' ');
  return [
    `[    ${t(0.0)}] Linux version 6.1.0-${Math.floor(rnd() * 30) + 10}-cloud (gcc 12.2.0)`,
    `[    ${t(0.3)}] Command line: root=UUID=${inst.id.slice(2, 10)} ro console=ttyS0`,
    `[    ${t(0.9)}] Memory: ${inst.type.includes('micro') ? '1024' : '4096'}MB available`,
    `[    ${t(1.4)}] Hypervisor detected: KVM`,
    `[    ${t(2.1)}] EBS root device ${inst.rootDeviceName || '/dev/xvda'} attached`,
    `[    ${t(3.2)}] eth0: assigned ${inst.privateIp}`,
    `[    ${t(4.0)}] cloud-init: fetching metadata from 169.254.169.254`,
    `[    ${t(5.5)}] cloud-init: applied key pair "${inst.keyPair || 'none'}"`,
    `[    ${t(6.8)}] systemd: Reached target Multi-User System`,
    `[    ${t(7.1)}] login: instance ${inst.id} ready`,
  ].join('\n');
}

function diagnose(inst, store) {
  const checks = [];
  checks.push({
    name: 'Instance state',
    ok: inst.state === 'running',
    detail: inst.state === 'running' ? 'Instance is running' : `Instance is ${inst.state}`,
  });
  checks.push({
    name: 'System status check',
    ok: inst.state === 'running',
    detail: inst.state === 'running' ? '1/1 checks passed' : 'Not applicable while not running',
  });
  const sgs = (store.securityGroups || []).filter((g) => (inst.securityGroups || []).includes(g.id));
  const openSsh = sgs.some((g) => (g.inboundRules || []).some(
    (r) => String(r.portRange ?? r.port) === '22' && /0\.0\.0\.0\/0/.test(r.source || '')));
  checks.push({
    name: 'SSH reachability',
    ok: sgs.some((g) => (g.inboundRules || []).some((r) => String(r.portRange ?? r.port) === '22')),
    detail: sgs.length === 0 ? 'No security group resolved for this instance'
      : openSsh ? 'Port 22 open to 0.0.0.0/0 — reachable, but broader than recommended'
      : 'Port 22 rule present' ,
  });
  checks.push({
    name: 'Public addressability',
    ok: !!inst.publicIp && inst.publicIp !== '-',
    detail: inst.publicIp && inst.publicIp !== '-' ? `Public IPv4 ${inst.publicIp}` : 'No public IPv4 address',
  });
  checks.push({
    name: 'Key pair',
    ok: !!inst.keyPair,
    detail: inst.keyPair ? `Launched with ${inst.keyPair}` : 'No key pair recorded',
  });
  return checks;
}

export default function InstanceActionDialog({ item, instance, store, onClose, onApply }) {
  const [value, setValue] = useState(() => {
    if (!item.field) return null;
    if (item.kind === 'tags') return (instance.tags || []).map((t) => ({ ...t }));
    const cur = instance[item.field];
    if (item.kind === 'toggle') return !!cur;
    if (item.kind === 'select') return cur ?? item.options?.[0] ?? '';
    if (item.kind === 'number') return Number(cur ?? 1);
    if (item.kind === 'securityGroups') return [...(cur || [])];
    return cur ?? '';
  });

  const title = item.label;
  const commit = (fields, message) => { onApply(fields, message); onClose(); };

  const body = () => {
    switch (item.kind) {
      case 'toggle':
        return (
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={!!value} onChange={(e) => setValue(e.target.checked)} />
            <span><span className="font-bold">Enable</span><br />
              <span className="text-aws-text-secondary">{item.help}</span></span>
          </label>
        );
      case 'select':
        return (
          <div>
            <label className="block font-bold mb-1">{item.label}</label>
            <select className="aws-input" value={value} onChange={(e) => setValue(e.target.value)}>
              {item.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <p className="text-aws-text-secondary mt-2">{item.help}</p>
          </div>
        );
      case 'number':
        return (
          <div>
            <label className="block font-bold mb-1">{item.label}</label>
            <input type="number" min="1" className="aws-input" value={value}
              onChange={(e) => setValue(Number(e.target.value))} />
            <p className="text-aws-text-secondary mt-2">{item.help}</p>
          </div>
        );
      case 'textarea':
        return (
          <div>
            <label className="block font-bold mb-1">User data</label>
            <textarea className="aws-input font-mono" rows={8} value={value}
              onChange={(e) => setValue(e.target.value)} placeholder="#!/bin/bash" />
            <p className="text-aws-text-secondary mt-2">{item.help}</p>
          </div>
        );
      case 'text':
        return (
          <div>
            <label className="block font-bold mb-1">{item.label}</label>
            <input className="aws-input" value={value} onChange={(e) => setValue(e.target.value)} />
            <p className="text-aws-text-secondary mt-2">{item.help}</p>
          </div>
        );
      case 'tags':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 font-bold"><span>Key</span><span>Value</span><span /></div>
            {value.length === 0 && <p className="text-aws-text-secondary">No tags associated with this resource.</p>}
            {value.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input className="aws-input" aria-label={`Tag key ${i + 1}`} value={t.Key}
                  onChange={(e) => setValue(value.map((x, j) => j === i ? { ...x, Key: e.target.value } : x))} />
                <input className="aws-input" aria-label={`Tag value ${i + 1}`} value={t.Value}
                  onChange={(e) => setValue(value.map((x, j) => j === i ? { ...x, Value: e.target.value } : x))} />
                <button type="button" aria-label="Remove tag" className="p-1.5 hover:bg-aws-disabled-bg"
                  onClick={() => setValue(value.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="aws-btn aws-btn-secondary text-xs"
              onClick={() => setValue([...value, { Key: '', Value: '' }])}>Add new tag</button>
          </div>
        );
      case 'securityGroups':
        return (
          <div>
            <label className="block font-bold mb-2">Associated security groups</label>
            {(store.securityGroups || []).map((g) => (
              <label key={g.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input type="checkbox" checked={value.includes(g.id)}
                  onChange={(e) => setValue(e.target.checked ? [...value, g.id] : value.filter((x) => x !== g.id))} />
                <span className="font-mono text-xs">{g.id}</span><span>{g.name}</span>
              </label>
            ))}
            <p className="text-aws-text-secondary mt-2">{item.help}</p>
          </div>
        );
      case 'clear':
        return <p>{item.help} Current value: <span className="font-mono">{String(instance[item.field] ?? '–')}</span></p>;
      case 'connect': {
        const host = instance.publicIp && instance.publicIp !== '-' ? instance.publicIp : instance.privateIp;
        return (
          <div className="space-y-3">
            <p className="text-aws-text-secondary">{item.help}</p>
            <div>
              <p className="font-bold mb-1">SSH client</p>
              <pre className="bg-aws-disabled-bg p-3 text-xs overflow-x-auto font-mono">{`chmod 400 ${instance.keyPair || 'key'}.pem
ssh -i "${instance.keyPair || 'key'}.pem" ec2-user@${host}`}</pre>
            </div>
            <div>
              <p className="font-bold mb-1">Session Manager</p>
              <pre className="bg-aws-disabled-bg p-3 text-xs overflow-x-auto font-mono">{`aws ssm start-session --target ${instance.id}`}</pre>
            </div>
          </div>
        );
      }
      case 'systemLog':
        return <pre className="bg-black text-green-400 p-3 text-xs overflow-auto font-mono max-h-80">{systemLogFor(instance)}</pre>;
      case 'screenshot':
        return (
          <div className="bg-black text-gray-200 p-4 font-mono text-xs max-h-80 overflow-auto">
            <p>{instance.amiName || 'Linux'} ({instance.id})</p>
            <p className="mt-3">{instance.id.slice(0, 12)} login: _</p>
          </div>
        );
      case 'serialPort':
        return (
          <div>
            <p className="text-aws-text-secondary mb-2">{item.help}</p>
            <pre className="bg-black text-gray-200 p-3 text-xs font-mono">{`Connected to ${instance.id} serial port 0\n\n${instance.id.slice(0, 12)} login:`}</pre>
          </div>
        );
      case 'diagnostics': {
        const checks = diagnose(instance, store);
        return (
          <table className="aws-table">
            <thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.name}>
                  <td className="font-medium">{c.name}</td>
                  <td><span className={`aws-badge ${c.ok ? 'bg-aws-status-success-bg text-aws-success' : 'bg-aws-status-warning-bg text-aws-warning'}`}>{c.ok ? 'Passed' : 'Attention'}</span></td>
                  <td className="text-aws-text-secondary">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      case 'readonly':
      default:
        return <p className="text-aws-text-secondary">{item.help}</p>;
    }
  };

  const mutates = ['toggle', 'select', 'number', 'textarea', 'text', 'tags', 'securityGroups', 'clear'].includes(item.kind);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-white shadow-xl w-full max-w-2xl border border-aws-border my-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-4 text-sm space-y-3">
          <p className="text-aws-text-secondary">Instance <span className="font-mono">{instance.id}</span></p>
          {body()}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-aws-border">
          <button className="aws-btn aws-btn-secondary" onClick={onClose}>{mutates ? 'Cancel' : 'Close'}</button>
          {mutates && (
            <button className="aws-btn aws-btn-primary" onClick={() => {
              const v = item.kind === 'clear' ? '-' : value;
              commit({ [item.field]: v }, `${item.label} applied to ${instance.id}`);
            }}>Save</button>
          )}
        </div>
      </div>
    </div>
  );
}
