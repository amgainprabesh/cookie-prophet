export function short(s: string, head = 4, tail = 4): string {
  if (!s || s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function fmtUsd(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1_000).toFixed(1)}k`;
  if (Math.abs(v) >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

export function fmtPrice(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  if (Math.abs(v) < 0.01) return v.toPrecision(3);
  return v.toFixed(4);
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function clockTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Timestamp of the next 00:00 UTC after `from`. */
export function nextUtcMidnight(from = Date.now()): number {
  const d = new Date(from);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'closed';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
}

export function utcShort(ts: number): string {
  const d = new Date(ts);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    d.getUTCMonth()
  ];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month} ${d.getUTCDate()} · ${hh}:${mm} UTC`;
}

/** COOK amounts: keeps tiny balances (gas leftovers) readable instead of "0". */
export function fmtCook(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (abs >= 1e-4) return v.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
  return v.toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
}
