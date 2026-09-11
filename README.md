# 🍪 Cookie Prophet

A live **forecast game + agent wire** for [Cookie Chain](https://cookiechain.wtf) — built for the
[Superteam cApp bounty](https://superteam.fun/earn/listing/create-an-app-on-cookie-chain-app).

**Live app:** https://amgainprabesh.github.io/cookie-prophet/ — auto-deployed from `main` via GitHub Pages.

**The idea, in one line:** the chain is the content — a live wire of real on-chain events (pools,
flows, launches, price moves), plus market cycles you can call.

**The rules that make it judge-proof:**
- Every call commits as a tiny **on-chain memo transaction** — your receipt, on the blockchain.
- Markets **resolve automatically from public chain data** — no oracle, no human judgment, ever.
- **Points and badges only — no wagering.**

## Status — v0.3 (auto-resolver live)
- [x] Live wire: real pool / liquidity / price / launch events from the markets API, DAS and RPC
- [x] Wallet connect — Nightly (wallet-standard flow), Phantom, Solflare, Backpack
- [x] On-chain call receipts — every forecast call is a memo tx (`cookie-prophet:v1:<market>:<pick>`)
- [x] Auto-resolver — cycles open & settle from chain data alone; ledger in `public/resolutions.json`;
      GitHub Action advances it every 30 min
- [ ] The Prophet agent (cookie-mcp) — public calls + paper book
- [ ] Season leaderboard & badges

## How resolution works
1. **At cycle open** the resolver snapshots the chain (tracked pool count, slot) and publishes the
   snapshot plus the per-cycle slot target into `resolutions.json`. Nothing is secret — the exact
   numbers being played against are public from the start.
2. **At close** it reads the same public endpoints again and writes each outcome with its evidence
   (values, timestamps, source) into the ledger.
3. The app reads the ledger, shows outcomes, and scores calls client-side — the *last call before
   close* counts. Anyone can audit with `node scripts/resolve.mjs --status`.

| Market | Question | Resolves from |
|---|---|---|
| m1 | Will a new pool appear before close? | `api.cookiescan.io/api/markets` (pool count) |
| m2 | Will the chain advance its published slot target? | `rpc.cookiescan.io` (`getSlot`) |

## Data sources (all live)
| Source | Endpoint | Used for |
|---|---|---|
| Markets API | `https://api.cookiescan.io/api/markets` | pools, liquidity, COOK price |
| DAS | `https://api.cookiescan.io` (`searchAssets`) | fresh mints / launches |
| RPC | `https://rpc.cookiescan.io` | chain pulse, balance, tx submit, slots |

## Run it
```bash
npm install --omit=optional   # then pin native binaries (see note below on Windows/OneDrive)
npm run dev                   # http://localhost:3100
npm run build
node scripts/wire-smoke.mjs   # live-data smoke test for the wire engine
node scripts/memo-verify.mjs  # simulates the exact call transaction on Cookie Chain
node scripts/resolve.mjs      # advance market cycles (idempotent; run by CI every 30 min)
node scripts/resolve.mjs --status  # audit the public ledger
```

On Windows under OneDrive, npm can fight optional dependency trees: install with
`--omit=optional`, then `npm install -D @rollup/rollup-win32-x64-msvc@<rollup-version> @esbuild/win32-x64@<esbuild-version>`.

## License
MIT
