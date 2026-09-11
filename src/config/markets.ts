export interface MarketDef {
  id: string;
  question: string;
  rule: string;
  source: string;
  status: 'open' | 'resolved';
  outcome?: 'YES' | 'NO';
}

// Calls can be committed now; the auto-resolver (next build) opens the
// markets, computes outcomes from public chain data and posts the results.
export const MARKETS: MarketDef[] = [
  {
    id: 'm1',
    question: 'Will a fresh token mint its first pool before 00:00 UTC?',
    rule: 'YES if at least one new pool appears for a mint first seen during the cycle.',
    source: 'api.cookiescan.io markets index, read at 00:00 UTC',
    status: 'open',
  },
  {
    id: 'm2',
    question: 'bCOOK staking ratio ≥ 1.303 at 00:00 UTC?',
    rule: 'YES if the stake pool exchange rate reads 1.303 or higher at close.',
    source: 'stake pool account GxbN…UGH4, read on-chain',
    status: 'open',
  },
];
