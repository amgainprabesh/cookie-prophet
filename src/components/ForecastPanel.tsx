import React from 'react';
import { Sparkles } from 'lucide-react';
import { MARKETS } from '../config/markets';

export const ForecastPanel: React.FC = () => {
  return (
    <div className="rounded-2xl border border-cookie-200/80 bg-white/80 shadow-sm">
      <div className="px-4 sm:px-5 py-3.5 border-b border-cookie-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-stone-900">Open Forecasts</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">daily questions · auto-resolved from chain data</p>
        </div>
        <span className="text-[9.5px] font-extrabold tracking-wider text-prophet-700 bg-prophet-50 border border-prophet-200 rounded px-1.5 py-0.5">
          PREVIEW
        </span>
      </div>

      <div className="p-3 space-y-3">
        {MARKETS.map((m) => (
          <div key={m.id} className="rounded-xl border border-cookie-200/80 p-3.5 bg-white">
            <p className="text-[13px] font-semibold text-stone-800 leading-snug">{m.question}</p>
            <p className="text-[11.5px] text-stone-500 mt-1.5">
              <span className="font-semibold text-stone-600">Rule:</span> {m.rule}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              <span className="font-semibold">Resolves:</span> {m.source}
            </p>
            <div className="flex items-center justify-between gap-2 mt-2.5">
              <span className="text-[10.5px] font-mono text-stone-400">closes {m.closesLabel}</span>
              <div className="flex gap-1.5">
                <button
                  disabled
                  className="rounded-md border border-emerald-300 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-bold text-emerald-700 opacity-60 cursor-not-allowed"
                >
                  YES · 10 pts
                </button>
                <button
                  disabled
                  className="rounded-md border border-rose-300 bg-rose-50/60 px-2.5 py-1 text-[11px] font-bold text-rose-700 opacity-60 cursor-not-allowed"
                >
                  NO · 10 pts
                </button>
              </div>
            </div>
          </div>
        ))}

        <p className="text-[11px] text-stone-500 leading-snug flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-prophet-500 mt-0.5 shrink-0" />
          On-chain call commits land in v0.2 — your pick becomes a tiny memo transaction on Cookie
          Chain, and every resolution links to its explorer receipt. Points only, no wagering.
        </p>
      </div>
    </div>
  );
};
