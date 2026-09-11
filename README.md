# 🍪 Cookie Prophet

A live **forecast game + agent wire** for [Cookie Chain](https://cookiechain.wtf) — built for the
[Superteam cApp bounty](https://superteam.fun/earn/listing/create-an-app-on-cookie-chain-app).

**The idea, in one line:** the chain is the content — a live wire of real on-chain events (pools,
flows, launches, price moves), plus daily forecasts you can call.

**The rules that make it judge-proof:**
- Every call commits as a tiny **on-chain memo transaction** — your receipt, on the blockchain.
- Markets **resolve automatically from public chain data** — no oracle, no human judgment, ever.
- **Points and badges only — no wagering.**

## Status — v0.1 (wire layer live)
- [x] Live wire: real pool / liquidity / price / launch events from the markets API, DAS and RPC
- [ ] Wallet connect (Nightly) + on-chain call commits
- [ ] Auto-resolver + market engine
- [ ] The Prophet agent (cookie-mcp) — public calls + paper book
- [ ] Season leaderboard & badges

## Data sources (all live)
| Source | Endpoint | Used for |
|---|---|---|
| Markets API | `https://api.cookiescan.io/api/markets` | pools, liquidity, COOK price |
| DAS | `https://api.cookiescan.io` (`searchAssets`) | fresh mints / launches |
| RPC | `https://rpc.cookiescan.io` | chain pulse |

## Run it
```bash
npm install
npm run dev                   # http://localhost:3100
npm run build
node scripts/wire-smoke.mjs   # live-data smoke test for the wire engine
```

## License
MIT
