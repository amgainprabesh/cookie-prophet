import React from 'react';

const LIVE = [
  'The Wire — real pool, flow, launch & price events straight from Cookie Chain',
  'Wallet connect — Nightly (wallet-standard), Phantom, Solflare, Backpack',
  'On-chain call receipts — every forecast call commits as a memo transaction',
];

const NEXT = [
  'Auto-resolver — markets settle from chain data alone',
  'The Prophet agent — public calls, paper book, powered by cookie-mcp',
  'Season leaderboard, streaks & badges',
];

export const StatusPanel: React.FC = () => (
  <div className="rounded-2xl border border-cookie-200/80 bg-white/80 shadow-sm p-4 sm:p-5">
    <h2 className="text-sm font-extrabold tracking-tight text-stone-900">Build status</h2>
    <p className="text-[11px] text-stone-500 mt-0.5">v0.2 — calls are on-chain</p>

    <div className="mt-3.5 space-y-3">
      <div>
        <p className="text-[10px] font-extrabold tracking-wider text-emerald-700">LIVE NOW</p>
        <ul className="mt-1.5 space-y-1.5">
          {LIVE.map((x) => (
            <li key={x} className="text-[12px] text-stone-600 leading-snug flex gap-1.5">
              <span className="text-emerald-500">●</span>
              {x}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] font-extrabold tracking-wider text-stone-400">IN BUILD</p>
        <ul className="mt-1.5 space-y-1.5">
          {NEXT.map((x) => (
            <li key={x} className="text-[12px] text-stone-600 leading-snug flex gap-1.5">
              <span className="text-stone-300">○</span>
              {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);
