// Live-data smoke test for the Wire engine (Node 18+).
// Mirrors the app's diff rules against the real Cookie Chain APIs:
// proves the endpoints are live and that real events flow.
const MARKETS = 'https://api.cookiescan.io/api/markets';
const DAS = 'https://api.cookiescan.io';

async function snap() {
  const r = await fetch(MARKETS);
  const j = await r.json();
  return {
    ts: Date.now(),
    cookUsd: j.cookUsd,
    marketCount: j.marketCount,
    pools: j.markets.map((m) => ({
      id: m.marketId,
      pair: `${m.baseToken?.symbol}/${m.quoteToken?.symbol}`,
      venue: m.type,
      liq: m.liquidityUsd || 0,
    })),
  };
}

const a = await snap();
console.log(`snap1: ${a.marketCount} pools tracked, COOK $${a.cookUsd}`);
console.log('waiting 20s for a second reading...');
await new Promise((r) => setTimeout(r, 20000));
const b = await snap();
console.log(`snap2: ${b.marketCount} pools tracked, COOK $${b.cookUsd}`);

const events = [];
const pct = a.cookUsd > 0 ? ((b.cookUsd - a.cookUsd) / a.cookUsd) * 100 : 0;
if (Math.abs(pct) >= 0.4) events.push(`PRICE  COOK ${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`);

const prevIds = new Set(a.pools.map((p) => p.id));
const prev = new Map(a.pools.map((p) => [p.id, p]));
for (const p of b.pools) {
  if (!prevIds.has(p.id)) events.push(`POOL   new: ${p.pair} on ${p.venue} ($${p.liq.toFixed(0)})`);
}
let n = 0;
for (const p of b.pools) {
  const o = prev.get(p.id);
  if (!o) continue;
  const d = p.liq - o.liq;
  if (Math.abs(d) >= Math.max(25, o.liq * 0.08) && n < 4) {
    events.push(`FLOW   ${p.pair} (${p.venue}) ${d > 0 ? '+' : ''}$${Math.abs(d).toFixed(0)}`);
    n++;
  }
}
if (b.marketCount !== a.marketCount) events.push(`CHAIN  pool count ${a.marketCount} -> ${b.marketCount}`);

console.log(events.length ? `events detected this window:\n  - ${events.join('\n  - ')}` : 'no threshold events in this 20s window (normal during quiet periods)');

const das = await fetch(DAS, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'searchAssets',
    params: { sortBy: { sortBy: 'created', sortDirection: 'desc' }, limit: 3 },
  }),
});
const dj = await das.json();
const mints = (dj.result?.items || []).map((i) => i.content?.metadata?.symbol || i.id.slice(0, 10)).join(', ');
console.log(`latest mints (DAS): ${mints || 'none returned'}`);
