// Cookie Prophet — auto-resolver + agent brain (zero-dependency, Node 18+)
//
// Advances the market cycles: opens new cycles (publishing the open snapshot
// as public evidence) and finalizes finished cycles by reading the same
// public endpoints the app uses. No human judgment anywhere.
//
// The Prophet agent (deterministic, auditable):
//  - m2 (slot target): takes its OWN live slot-velocity measurement and
//    projects the advance to close. Reason string quotes the measurement.
//  - m1 (new pool): base-rate strategy over resolved cycle history.
//  - paper book: tracks the top pools by liquidity across cycles.
// Picks are written into the public ledger. When an agent keypair is funded
// (CP_AGENT_KEYPAIR env + --commit), picks are also committed on-chain as
// memo transactions — same format as human calls.
//
// Usage:
//   node scripts/resolve.mjs            # advance cycles + ensure agent picks
//   node scripts/resolve.mjs --status   # print ledger summary
//   node scripts/resolve.mjs --commit   # also send agent memos if key funded

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = join(__dirname, '..', 'public', 'resolutions.json');

const MARKETS_API = 'https://api.cookiescan.io/api/markets';
const RPC = 'https://rpc.cookiescan.io';

// Slot velocity measured live on Cookie Chain (~2.05-2.25 slots/s across samples).
const SLOT_RATE_NOMINAL = 2.1;
const SLOT_FACTOR = 1.02; // bar is set 2% above nominal so it is a real question
const MIN_CYCLE_MS = 30 * 60 * 1000; // a fresh cycle must run at least 30 min

const AGENT = {
  id: 'prophet-v1',
  name: 'The Prophet',
  // m2: measure velocity live, project to close, compare with target.
  // m1: conservative base-rate until 3 resolved cycles give real history.
  strategy: 'velocity-measurement + base-rate-v1',
};

async function rpc(method, params = []) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

async function readPoolCount() {
  const res = await fetch(MARKETS_API);
  const j = await res.json();
  return Number(j.marketCount ?? (Array.isArray(j.markets) ? j.markets.length : 0));
}

async function readSlot() {
  return Number(await rpc('getSlot'));
}

/** Two-point slot velocity measurement over `ms` milliseconds. */
async function measureSlotRate(ms = 20_000) {
  const s1 = await readSlot();
  const t1 = Date.now();
  await new Promise((r) => setTimeout(r, ms));
  const s2 = await readSlot();
  const t2 = Date.now();
  const rate = (s2 - s1) / ((t2 - t1) / 1000);
  return { rate, sampleSec: (t2 - t1) / 1000, delta: s2 - s1 };
}

async function readTopPools(limit = 3) {
  const res = await fetch(MARKETS_API);
  const j = await res.json();
  const pools = Array.isArray(j.markets) ? j.markets : [];
  return pools
    .map((m) => ({
      pair: `${m.baseToken?.symbol || '?'}/${m.quoteToken?.symbol || '?'}`,
      venue: String(m.type || 'AMM'),
      marketId: String(m.marketId || ''),
      liquidityUsd: Number(m.liquidityUsd || 0),
    }))
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, limit);
}

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) {
    return { version: 1, updatedAt: new Date().toISOString(), cycles: [] };
  }
  const parsed = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  if (!Array.isArray(parsed.cycles)) parsed.cycles = [];
  return parsed;
}

function saveLedger(ledger) {
  ledger.updatedAt = new Date().toISOString();
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
}

function nextUtcMidnight(from) {
  const d = new Date(from);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

function buildMarkets(minDelta) {
  return [
    {
      id: 'm1',
      type: 'pool-count-increase',
      question: 'Will a new pool appear before close?',
      rule: 'YES if the tracked pool count at close is greater than at open.',
      source: 'api.cookiescan.io/api/markets',
      params: {},
    },
    {
      id: 'm2',
      type: 'slot-advance',
      question: `Will the chain advance ${minDelta.toLocaleString('en-US')}+ slots before close?`,
      rule: `YES if the slot at close is at least ${minDelta.toLocaleString('en-US')} higher than at open.`,
      source: 'rpc.cookiescan.io getSlot',
      params: { minDelta },
    },
  ];
}

// ---------------- agent brain ----------------

async function agentPicks(ledger, cycle) {
  const picks = {};

  // m2 — measure velocity live and project to close
  try {
    const { rate, sampleSec, delta } = await measureSlotRate(20_000);
    const secToClose = Math.max(0, (cycle.closesAt - Date.now()) / 1000);
    const projected = Math.round(rate * secToClose);
    const minDelta = cycle.markets.find((m) => m.id === 'm2')?.params?.minDelta ?? 0;
    picks.m2 = {
      pick: projected >= minDelta ? 'YES' : 'NO',
      reason: `measured ${rate.toFixed(2)} slots/s over ${sampleSec.toFixed(0)}s (${delta} slots) → projects ${projected.toLocaleString('en-US')} vs target ${minDelta.toLocaleString('en-US')}`,
    };
  } catch {
    picks.m2 = { pick: 'YES', reason: 'velocity measurement failed — defaulting to nominal-rate prior' };
  }

  // m1 — base rate from resolved history (needs 3 settled cycles to mean anything)
  const resolved = ledger.cycles.filter((c) => c.resolvedAt && c.outcomes?.m1);
  if (resolved.length >= 3) {
    const yes = resolved.filter((c) => c.outcomes.m1.outcome === 'YES').length;
    const rate = yes / resolved.length;
    picks.m1 = {
      pick: rate >= 0.5 ? 'YES' : 'NO',
      reason: `new pools appeared in ${yes}/${resolved.length} resolved cycles — base rate favors ${rate >= 0.5 ? 'YES' : 'NO'}`,
    };
  } else {
    picks.m1 = {
      pick: 'NO',
      reason: `conservative prior — pool creation is rare (${resolved.length}/3 history so far); needs evidence to flip`,
    };
  }

  return picks;
}

async function agentPaperBook(ledger) {
  const top = await readTopPools(3);
  const prev = ledger.agent?.paper?.positions ?? [];
  const prevPairs = new Set(prev.map((p) => p.pair));
  const decisions = [];
  for (const p of top) {
    if (!prevPairs.has(p.pair) && prev.length > 0) {
      decisions.push(`entered ${p.pair} (${p.venue}) — now a top-3 pool at $${Math.round(p.liquidityUsd)}`);
    }
  }
  for (const p of prev) {
    if (!top.some((t) => t.pair === p.pair)) {
      decisions.push(`exited ${p.pair} — dropped out of top-3`);
    }
  }
  if (!decisions.length && prev.length > 0) decisions.push('hold — top-3 unchanged');
  if (prev.length === 0) decisions.push(`opened paper positions in the top-3 pools by liquidity`);

  return {
    updatedAt: Date.now(),
    note: 'paper only — no funds; positions follow the top pools by liquidity',
    positions: top,
    decisions,
  };
}

async function ensureAgent(ledger, cycle) {
  if (cycle.agent?.picks?.m1 && cycle.agent?.picks?.m2) return;
  const picks = await agentPicks(ledger, cycle);
  const paper = await agentPaperBook(ledger);
  cycle.agent = { ...AGENT, picks, paper, committed: cycle.agent?.committed ?? null };
  console.log(`[agent] picks for ${cycle.id}: m1=${picks.m1.pick} m2=${picks.m2.pick}`);
}

/**
 * Commit the agent's picks on-chain — same memo format as human calls.
 * Requires a funded keypair JSON at CP_AGENT_KEYPAIR (base58 keypair file
 * as written by `solana-keygen new`). Runs only with --commit.
 */
async function commitAgentPicks(cycle) {
  const keyPath = process.env.CP_AGENT_KEYPAIR;
  if (!keyPath || !existsSync(keyPath)) return null;

  const { Keypair, Connection, Transaction, TransactionInstruction, PublicKey } = await import(
    '@solana/web3.js'
  );
  const MEMO = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const secret = new Uint8Array(JSON.parse(readFileSync(keyPath, 'utf8')));
  const payer = Keypair.fromSecretKey(secret);
  const conn = new Connection(RPC, 'confirmed');
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');

  const sigs = {};
  for (const marketId of ['m1', 'm2']) {
    const pick = cycle.agent.picks[marketId].pick;
    const memo = `cookie-prophet:v1:${marketId}:${pick}`;
    const tx = new Transaction().add(
      new TransactionInstruction({ programId: MEMO, keys: [], data: Buffer.from(memo, 'utf8') })
    );
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;
    tx.sign(payer);
    const sig = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
    sigs[marketId] = sig;
    console.log(`[agent] committed ${marketId}=${pick} → ${sig}`);
  }
  return { wallet: payer.publicKey.toBase58(), sigs, committedAt: Date.now() };
}

// ---------------- cycle engine ----------------

async function openCycle(ledger, kind, closesAt) {
  const now = Date.now();
  const [poolCount, slot] = await Promise.all([readPoolCount(), readSlot()]);
  const durationSec = Math.max(0, (closesAt - now) / 1000);
  const minDelta = Math.max(500, Math.round((durationSec * SLOT_RATE_NOMINAL * SLOT_FACTOR) / 100) * 100);

  const cycle = {
    id: new Date(closesAt).toISOString(),
    kind,
    openedAt: now,
    closesAt,
    open: { poolCount, slot, fetchedAt: now },
    markets: buildMarkets(minDelta),
    resolvedAt: null,
    outcomes: null,
  };
  ledger.cycles.push(cycle);
  console.log(`[open] ${kind} cycle ${cycle.id} — pools=${poolCount} slot=${slot} minDelta=${minDelta}`);
  await ensureAgent(ledger, cycle);
  return cycle;
}

async function finalizeCycle(ledger, cycle) {
  const now = Date.now();
  const [poolCount, slot] = await Promise.all([readPoolCount(), readSlot()]);
  const minDelta = cycle.markets.find((m) => m.id === 'm2')?.params?.minDelta ?? 0;

  const m1 = poolCount > cycle.open.poolCount ? 'YES' : 'NO';
  const m2 = slot >= cycle.open.slot + minDelta ? 'YES' : 'NO';

  cycle.outcomes = {
    m1: {
      outcome: m1,
      evidence: {
        open: cycle.open.poolCount,
        close: poolCount,
        at: now,
        lateMs: now - cycle.closesAt,
        source: 'api.cookiescan.io/api/markets',
      },
    },
    m2: {
      outcome: m2,
      evidence: {
        open: cycle.open.slot,
        close: slot,
        minDelta,
        at: now,
        lateMs: now - cycle.closesAt,
        source: 'rpc.cookiescan.io getSlot',
      },
    },
  };
  cycle.resolvedAt = now;
  console.log(
    `[resolve] ${cycle.id} — m1=${m1} (${cycle.open.poolCount}→${poolCount}), ` +
      `m2=${m2} (${cycle.open.slot}→${slot}, needed +${minDelta})`
  );
}

async function main() {
  const ledger = loadLedger();
  const now = Date.now();

  if (process.argv.includes('--status')) {
    if (!ledger.cycles.length) {
      console.log('ledger empty — no cycles yet');
      return;
    }
    for (const c of ledger.cycles) {
      const outcomes = c.outcomes
        ? Object.entries(c.outcomes).map(([k, v]) => `${k}=${v.outcome}`).join(' ')
        : 'pending';
      const agent = c.agent?.picks ? `agent: m1=${c.agent.picks.m1.pick} m2=${c.agent.picks.m2.pick}` : 'agent: —';
      console.log(`${c.id} [${c.kind}] ${outcomes} | ${agent}`);
      if (c.agent?.picks) {
        console.log(`   m1: ${c.agent.picks.m1.reason}`);
        console.log(`   m2: ${c.agent.picks.m2.reason}`);
      }
    }
    return;
  }

  const before = JSON.stringify(ledger.cycles);

  // finalize every cycle whose close time has passed
  for (const c of ledger.cycles) {
    if (!c.resolvedAt && now >= c.closesAt) {
      await finalizeCycle(ledger, c);
    }
  }

  // agent picks + paper book for the open cycle
  const open = ledger.cycles.find((c) => !c.resolvedAt);
  if (open) {
    await ensureAgent(ledger, open);
    if (process.argv.includes('--commit')) {
      if (!open.agent.committed) {
        const commit = await commitAgentPicks(open);
        if (commit) open.agent.committed = commit;
      } else {
        console.log('[agent] picks already committed on-chain');
      }
    }
  }

  // open a new cycle if none is pending
  const hasOpen = ledger.cycles.some((c) => !c.resolvedAt);
  if (!hasOpen) {
    let kind = 'daily';
    let closesAt;
    if (ledger.cycles.length === 0) {
      kind = 'inaugural';
      closesAt = (Math.floor(now / 3_600_000) + 2) * 3_600_000;
    } else {
      closesAt = nextUtcMidnight(now + MIN_CYCLE_MS);
    }
    await openCycle(ledger, kind, closesAt);
  }

  if (JSON.stringify(ledger.cycles) !== before) {
    saveLedger(ledger);
    console.log('[ledger] updated');
  } else {
    console.log('[ledger] no changes');
  }
}

main().catch((e) => {
  console.error('resolver error:', e);
  process.exit(1);
});
