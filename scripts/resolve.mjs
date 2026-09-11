// Cookie Prophet — auto-resolver (zero-dependency, Node 18+)
//
// Advances the market cycles: opens new cycles (publishing the open snapshot
// as public evidence) and finalizes finished cycles by reading the same
// public endpoints the app uses. No human judgment anywhere.
//
// Usage:
//   node scripts/resolve.mjs            # advance (finalize due cycles, open next)
//   node scripts/resolve.mjs --status   # print ledger summary
//
// The resulting ledger (public/resolutions.json) is the app's source of truth,
// served publicly and updated by .github/workflows/resolve.yml every 30 min.
//
// TODO(v0.4): once a funded resolver keypair is configured (secrets.RESOLVER_KEYPAIR),
// also post each resolution as an on-chain memo:
//   cookie-prophet:v1:resolve:<cycleId>:m1=<YES|NO>,m2=<YES|NO>

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = join(__dirname, '..', 'public', 'resolutions.json');

const MARKETS_API = 'https://api.cookiescan.io/api/markets';
const RPC = 'https://rpc.cookiescan.io';

// Slot velocity measured live on Cookie Chain (~2.05-2.25 slots/s across samples).
const SLOT_RATE = 2.1;
const SLOT_FACTOR = 1.02; // bar is set 2% above nominal so it is a real question
const MIN_CYCLE_MS = 30 * 60 * 1000; // a fresh cycle must run at least 30 min

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

async function openCycle(ledger, kind, closesAt) {
  const now = Date.now();
  const [poolCount, slot] = await Promise.all([readPoolCount(), readSlot()]);
  const durationSec = Math.max(0, (closesAt - now) / 1000);
  const minDelta = Math.max(500, Math.round((durationSec * SLOT_RATE * SLOT_FACTOR) / 100) * 100);

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
      console.log(`${c.id} [${c.kind}] open=${JSON.stringify(c.open)} ${outcomes}`);
    }
    return;
  }

  // finalize every cycle whose close time has passed
  for (const c of ledger.cycles) {
    if (!c.resolvedAt && now >= c.closesAt) {
      await finalizeCycle(ledger, c);
    }
  }

  // open a new cycle if none is pending
  const hasOpen = ledger.cycles.some((c) => !c.resolvedAt);
  if (!hasOpen) {
    let kind = 'daily';
    let closesAt;
    if (ledger.cycles.length === 0) {
      kind = 'inaugural';
      // first cycle: a short one so the whole loop is observable within the hour
      closesAt = (Math.floor(now / 3_600_000) + 2) * 3_600_000;
    } else {
      closesAt = nextUtcMidnight(now + MIN_CYCLE_MS);
    }
    await openCycle(ledger, kind, closesAt);
  }

  saveLedger(ledger);
}

main().catch((e) => {
  console.error('resolver error:', e);
  process.exit(1);
});
