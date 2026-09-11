import type { CallRecord } from '../types';
import { assignedCycleForCall, type Ledger, type LedgerCycle } from './ledger';

export interface BookRow {
  marketId: string;
  question: string;
  closesAt: number;
  pick: 'YES' | 'NO';
  outcome: 'YES' | 'NO' | null;
  correct: boolean | null;
  sig: string;
}

export interface Book {
  points: number;
  streak: number;
  calls: number;
  correct: number;
  rows: BookRow[];
}

/** Latest call by `wallet` for a market, with the cycle it is assigned to. */
export function callForMarket(
  ledger: Ledger | null,
  calls: CallRecord[],
  wallet: string | null,
  marketId: string
): { call: CallRecord; cycle: LedgerCycle } | null {
  if (!wallet || !ledger) return null;
  let best: { call: CallRecord; cycle: LedgerCycle } | null = null;
  for (const call of calls) {
    if (call.wallet !== wallet || call.marketId !== marketId) continue;
    const cycle = assignedCycleForCall(ledger, marketId, call.ts);
    if (!cycle) continue;
    if (!best || call.ts > best.call.ts) best = { call, cycle };
  }
  return best;
}

/**
 * Points: a correct call on a resolved cycle = +10. "Last call before close counts":
 * when several calls map to the same cycle, only the latest one scores.
 * Streak: trailing consecutive correct calls (pending calls don't break it).
 */
export function computeBook(ledger: Ledger | null, calls: CallRecord[], wallet: string | null): Book {
  const book: Book = { points: 0, streak: 0, calls: 0, correct: 0, rows: [] };
  if (!ledger || !wallet) return book;

  // latest call per (market, cycle)
  const byKey = new Map<string, CallRecord>();
  for (const call of calls) {
    if (call.wallet !== wallet) continue;
    const cycle = assignedCycleForCall(ledger, call.marketId, call.ts);
    if (!cycle) continue;
    const key = `${call.marketId}:${cycle.closesAt}`;
    const prev = byKey.get(key);
    if (!prev || call.ts > prev.ts) byKey.set(key, call);
  }

  const ordered = [...ledger.cycles].sort((a, b) => a.closesAt - b.closesAt);
  for (const cycle of ordered) {
    for (const market of cycle.markets) {
      const call = byKey.get(`${market.id}:${cycle.closesAt}`);
      if (!call) continue;
      const outcome = cycle.outcomes?.[market.id]?.outcome ?? null;
      const correct = outcome ? call.pick === outcome : null;
      book.rows.push({
        marketId: market.id,
        question: market.question,
        closesAt: cycle.closesAt,
        pick: call.pick,
        outcome,
        correct,
        sig: call.sig,
      });
      book.calls += 1;
      if (correct === true) {
        book.correct += 1;
        book.points += 10;
      }
    }
  }

  book.rows.sort((a, b) => b.closesAt - a.closesAt);
  for (const row of book.rows) {
    if (row.correct === true) book.streak += 1;
    else if (row.correct === false) break;
    // pending rows (correct === null) are skipped
  }
  return book;
}

export function evidenceLine(marketId: string, evidence: Record<string, number | string>): string {
  const e = evidence as any;
  if (marketId === 'm1') {
    return `pool count ${e.open} → ${e.close}`;
  }
  if (marketId === 'm2') {
    return `slot ${Number(e.open).toLocaleString()} → ${Number(e.close).toLocaleString()} (needed +${Number(e.minDelta).toLocaleString()})`;
  }
  return `${JSON.stringify(evidence)}`;
}
