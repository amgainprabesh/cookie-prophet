import { CHAIN } from '../config/constants';
import type { FreshAsset, MarketsSnap, PoolSnap } from '../types';
import { short } from '../utils/format';

export async function fetchMarkets(): Promise<MarketsSnap | null> {
  try {
    const res = await fetch(CHAIN.marketsApi, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const json: any = await res.json();
    if (!json?.success || !Array.isArray(json.markets)) return null;

    const pools: PoolSnap[] = json.markets.map((m: any) => {
      const baseSym = m.baseToken?.symbol || short(String(m.baseToken?.mint || ''), 4, 3);
      const quoteSym = m.quoteToken?.symbol || short(String(m.quoteToken?.mint || ''), 4, 3);
      return {
        marketId: String(m.marketId || ''),
        venue: String(m.type || 'AMM'),
        pairLabel: `${baseSym} / ${quoteSym}`,
        baseMint: String(m.baseToken?.mint || ''),
        quoteMint: String(m.quoteToken?.mint || ''),
        liquidityUsd: Number(m.liquidityUsd || 0),
      };
    });

    return {
      ts: Date.now(),
      cookUsd: Number(json.cookUsd || 0),
      marketCount: Number(json.marketCount || pools.length),
      pools,
    };
  } catch {
    return null;
  }
}

export async function fetchLatestAssets(limit = 6): Promise<FreshAsset[]> {
  try {
    const res = await fetch(CHAIN.das, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'cookie-prophet',
        method: 'searchAssets',
        params: {
          sortBy: { sortBy: 'created', sortDirection: 'desc' },
          limit,
        },
      }),
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    const items = json?.result?.items;
    if (!Array.isArray(items)) return [];
    return items.map((it: any) => ({
      id: String(it.id || ''),
      name: String(it?.content?.metadata?.name || 'New asset'),
      symbol: String(it?.content?.metadata?.symbol || ''),
    }));
  } catch {
    return [];
  }
}
