export interface MarketDef {
  id: string;
  question: string;
  rule: string;
  source: string;
  closesLabel: string;
  status: 'preview' | 'open' | 'resolved';
  outcome?: 'YES' | 'NO';
}

// v0.1: display-only preview of the first two daily markets.
// These definitions get finalized together with the auto-resolver in v0.2.
export const MARKETS: MarketDef[] = [
  {
    id: 'm1',
    question: 'Will a fresh token mint its first pool before 00:00 UTC?',
    rule: 'YES if at least one new pool appears for a mint first seen today.',
    source: 'api.cookiescan.io markets index, read at 00:00 UTC',
    closesLabel: 'daily · 00:00 UTC',
    status: 'preview',
  },
  {
    id: 'm2',
    question: 'bCOOK staking ratio ≥ 1.303 at 00:00 UTC?',
    rule: 'YES if the stake pool exchange rate reads 1.303 or higher at close.',
    source: 'stake pool account GxbN…UGH4, read on-chain',
    closesLabel: 'daily · 00:00 UTC',
    status: 'preview',
  },
];
