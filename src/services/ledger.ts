export interface LedgerOutcome {
  outcome: 'YES' | 'NO';
  evidence: Record<string, number | string>;
}

export interface LedgerMarket {
  id: string;
  type: string;
  question: string;
  rule: string;
  source: string;
  params?: Record<string, number>;
}

export interface AgentPick {
  pick: 'YES' | 'NO';
  reason: string;
}

export interface AgentState {
  id: string;
  name: string;
  strategy: string;
  picks: Record<string, AgentPick>;
  paper?: {
    updatedAt: number;
    note: string;
    positions: Array<{ pair: string; venue: string; marketId: string; liquidityUsd: number }>;
    decisions: string[];
  };
  committed?: { wallet: string; sigs: Record<string, string>; committedAt: number } | null;
}

export interface LedgerCycle {
  id: string;
  kind: 'inaugural' | 'daily' | string;
  openedAt: number;
  closesAt: number;
  open: { poolCount: number; slot: number; fetchedAt: number };
  markets: LedgerMarket[];
  resolvedAt: number | null;
  outcomes: Record<string, LedgerOutcome> | null;
  agent?: AgentState;
}

export interface Ledger {
  version: number;
  updatedAt: string;
  cycles: LedgerCycle[];
}

export async function fetchLedger(): Promise<Ledger | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}resolutions.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    return j && Array.isArray(j.cycles) ? (j as Ledger) : null;
  } catch {
    return null;
  }
}

export function openCycle(ledger: Ledger | null): LedgerCycle | null {
  if (!ledger) return null;
  const open = ledger.cycles.filter((c) => !c.resolvedAt);
  return open.length ? open[open.length - 1] : null;
}

export function lastResolvedForMarket(
  ledger: Ledger | null,
  marketId: string
): { cycle: LedgerCycle; outcome: LedgerOutcome } | null {
  if (!ledger) return null;
  const matches = ledger.cycles
    .filter((c) => c.resolvedAt && c.outcomes && c.outcomes[marketId] && c.markets.some((m) => m.id === marketId))
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
  if (!matches.length) return null;
  return { cycle: matches[0], outcome: matches[0].outcomes![marketId] };
}

/** Earliest cycle containing `marketId` whose close is at/after the call timestamp. */
export function assignedCycleForCall(
  ledger: Ledger | null,
  marketId: string,
  callTs: number
): LedgerCycle | null {
  if (!ledger) return null;
  const candidates = ledger.cycles
    .filter((c) => c.markets.some((m) => m.id === marketId) && c.closesAt >= callTs)
    .sort((a, b) => a.closesAt - b.closesAt);
  return candidates[0] ?? null;
}
