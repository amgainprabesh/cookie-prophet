import type { FreshAsset, MarketsSnap, PoolSnap, WireEvent, WireKind } from '../types';
import { LS, explorerAddressUrl, explorerTokenUrl } from '../config/constants';
import { fmtPrice, fmtUsd } from '../utils/format';

let seq = 0;

function mk(kind: WireKind, title: string, detail?: string, link?: string): WireEvent {
  seq += 1;
  return { id: `${Date.now().toString(36)}-${seq.toString(36)}`, ts: Date.now(), kind, title, detail, link };
}

/**
 * Pure diff between two markets snapshots — every emitted event is derived
 * from real API readings. No fabrication: quiet windows emit nothing.
 */
export function diffMarkets(prev: MarketsSnap | null, cur: MarketsSnap): WireEvent[] {
  if (!prev) {
    return [
      mk(
        'SYSTEM',
        `Wire online — watching ${cur.marketCount} pools on Cookie Chain`,
        `COOK at $${fmtPrice(cur.cookUsd)} right now`
      ),
    ];
  }

  const out: WireEvent[] = [];

  if (prev.cookUsd > 0 && cur.cookUsd > 0) {
    const pct = ((cur.cookUsd - prev.cookUsd) / prev.cookUsd) * 100;
    if (Math.abs(pct) >= 0.4) {
      out.push(
        mk(
          'PRICE',
          `COOK ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(2)}% — now $${fmtPrice(cur.cookUsd)}`,
          `previous reading $${fmtPrice(prev.cookUsd)}`
        )
      );
    }
  }

  const prevIds = new Set(prev.pools.map((p) => p.marketId));
  for (const p of cur.pools.filter((p) => !prevIds.has(p.marketId)).slice(0, 3)) {
    out.push(
      mk(
        'POOL',
        `New pool: ${p.pairLabel} on ${p.venue}`,
        `$${fmtUsd(p.liquidityUsd)} liquidity seeded`,
        explorerAddressUrl(p.marketId)
      )
    );
  }

  const prevMap = new Map(prev.pools.map((p) => [p.marketId, p]));
  const deltas: Array<{ pool: PoolSnap; delta: number }> = [];
  for (const p of cur.pools) {
    const old = prevMap.get(p.marketId);
    if (!old) continue;
    const delta = p.liquidityUsd - old.liquidityUsd;
    const threshold = Math.max(25, old.liquidityUsd * 0.08);
    if (Math.abs(delta) >= threshold) deltas.push({ pool: p, delta });
  }
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const { pool, delta } of deltas.slice(0, 4)) {
    out.push(
      mk(
        'FLOW',
        `${pool.pairLabel} (${pool.venue}) liquidity ${delta > 0 ? '+' : '−'}$${fmtUsd(Math.abs(delta))}`,
        `now $${fmtUsd(pool.liquidityUsd)}`
      )
    );
  }

  if (cur.marketCount !== prev.marketCount) {
    out.push(mk('CHAIN', `Pool count moved ${prev.marketCount} → ${cur.marketCount}`, 'cookiescan.io markets index'));
  }

  return out;
}

/**
 * Diff the DAS "latest created" list against everything we've seen.
 * First run seeds silently (no retroactive spam).
 */
export function diffAssets(seen: Set<string>, fresh: FreshAsset[]): WireEvent[] {
  const firstRun = seen.size === 0;
  const out: WireEvent[] = [];

  for (const a of fresh) {
    if (!a.id || seen.has(a.id)) continue;
    seen.add(a.id);
    if (firstRun) continue;
    out.push(
      mk(
        'LAUNCH',
        `New token: ${a.name}${a.symbol ? ` (${a.symbol})` : ''}`,
        'fresh mint just indexed by the DAS',
        explorerTokenUrl(a.id)
      )
    );
  }

  return out.slice(0, 3);
}

// ---- persistence (localStorage) ----

export function loadEvents(): WireEvent[] {
  try {
    const raw = localStorage.getItem(LS.events);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: WireEvent[]): void {
  try {
    localStorage.setItem(LS.events, JSON.stringify(events.slice(0, 80)));
  } catch {}
}

export function loadSnap(): MarketsSnap | null {
  try {
    const raw = localStorage.getItem(LS.snap);
    return raw ? (JSON.parse(raw) as MarketsSnap) : null;
  } catch {
    return null;
  }
}

export function saveSnap(snap: MarketsSnap): void {
  try {
    localStorage.setItem(LS.snap, JSON.stringify(snap));
  } catch {}
}

export function loadSeenAssets(): Set<string> {
  try {
    const raw = localStorage.getItem(LS.seenAssets);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.slice(0, 400) : []);
  } catch {
    return new Set();
  }
}

export function saveSeenAssets(seen: Set<string>): void {
  try {
    localStorage.setItem(LS.seenAssets, JSON.stringify(Array.from(seen).slice(-400)));
  } catch {}
}
