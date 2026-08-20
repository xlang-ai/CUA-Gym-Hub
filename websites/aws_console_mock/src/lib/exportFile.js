/**
 * Hand the browser a real file, and record that it happened.
 *
 * SANDBOX_COMPLETENESS_GUIDE.md: "Download creates an actual file blob" and "Prefer real,
 * minimal local behavior over fake feedback". A handler whose whole body is a success toast is
 * the defect that guidance names — and it is unverifiable besides, since a browser download
 * leaves nothing in `/go` `state_diff` for a reward function to read. Recording the export makes
 * "the agent exported the bill" a checkable fact.
 */
export function toCsv(header, rows) {
  const esc = (c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function downloadAndRecord({ dispatch, addFlash, kind, filename, content, mime = 'text/csv;charset=utf-8', rows }) {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    // Sandboxes can block a programmatic download; the recorded export below still stands.
  }
  dispatch({ type: 'RECORD_EXPORT', payload: { kind, filename, rows: rows ?? null, bytes: content.length } });
  if (addFlash) addFlash('success', `Exported ${filename}`);
}
