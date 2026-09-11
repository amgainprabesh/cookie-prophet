export type WireKind = 'SYSTEM' | 'POOL' | 'FLOW' | 'PRICE' | 'LAUNCH' | 'CHAIN' | 'AGENT';

export interface PoolSnap {
  marketId: string;
  venue: string;
  pairLabel: string;
  baseMint: string;
  quoteMint: string;
  liquidityUsd: number;
}

export interface MarketsSnap {
  ts: number;
  cookUsd: number;
  marketCount: number;
  pools: PoolSnap[];
}

export interface WireEvent {
  id: string;
  ts: number;
  kind: WireKind;
  title: string;
  detail?: string;
  link?: string;
}

export interface FreshAsset {
  id: string;
  name: string;
  symbol: string;
}

export interface ChainPulse {
  slot: number;
  version: string;
}
