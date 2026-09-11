import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { MARKETS } from '../config/markets';
import { useWallet } from '../context/WalletContext';
import { explorerTxUrl } from '../config/constants';
import { fmtCountdown, nextUtcMidnight } from '../utils/format';
import type { CallPick } from '../services/memo';

export const ForecastPanel: React.FC = () => {
  const { connected, publicKey, calls, sendCall, openModal } = useWallet();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const myCalls = publicKey ? calls.filter((c) => c.wallet === publicKey.toBase58()) : [];

  const handle = async (marketId: string, pick: CallPick) => {
    if (!connected) {
      openModal();
      return;
    }
    setSendingId(marketId);
    await sendCall(marketId, pick);
    setSendingId(null);
  };

  return (
    <div className="rounded-2xl border border-cookie-200/80 bg-white/80 shadow-sm">
      <div className="px-4 sm:px-5 py-3.5 border-b border-cookie-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-stone-900">Open Forecasts</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">daily questions · auto-resolved from chain data</p>
        </div>
        <span className="text-[9.5px] font-extrabold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
          LIVE
        </span>
      </div>

      <div className="p-3 space-y-3">
        {MARKETS.map((m) => {
          const closesAt = nextUtcMidnight(now);
          const mine = myCalls.filter((c) => c.marketId === m.id).sort((a, b) => b.ts - a.ts)[0];
          const sending = sendingId === m.id;

          return (
            <div key={m.id} className="rounded-xl border border-cookie-200/80 p-3.5 bg-white">
              <p className="text-[13px] font-semibold text-stone-800 leading-snug">{m.question}</p>
              <p className="text-[11.5px] text-stone-500 mt-1.5">
                <span className="font-semibold text-stone-600">Rule:</span> {m.rule}
              </p>
              <p className="text-[11px] text-stone-400 mt-1">
                <span className="font-semibold">Resolves:</span> {m.source}
              </p>

              <div className="flex items-center justify-between gap-2 mt-2.5">
                <span className="text-[10.5px] font-mono text-stone-400">
                  closes in {fmtCountdown(closesAt - now)} · cycles daily
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={sending}
                    onClick={() => handle(m.id, 'YES')}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      mine?.pick === 'YES'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-emerald-300 bg-emerald-50/60 text-emerald-700 hover:border-emerald-500'
                    }`}
                  >
                    YES · 10 pts
                  </button>
                  <button
                    disabled={sending}
                    onClick={() => handle(m.id, 'NO')}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      mine?.pick === 'NO'
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-rose-300 bg-rose-50/60 text-rose-700 hover:border-rose-500'
                    }`}
                  >
                    NO · 10 pts
                  </button>
                </div>
              </div>

              {(sending || mine) && (
                <div className="mt-2 pt-2 border-t border-cookie-100 flex items-center gap-1.5 text-[11px] flex-wrap">
                  {sending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-cookie-500" />
                      <span className="text-stone-500">waiting for your wallet…</span>
                    </>
                  ) : mine ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-stone-600 font-semibold">Your call: {mine.pick}</span>
                      <a
                        href={explorerTxUrl(mine.sig)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 font-bold text-cookie-700 hover:underline"
                      >
                        receipt <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-stone-400">· last call before close counts</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-[11px] text-stone-500 leading-snug flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-prophet-500 mt-0.5 shrink-0" />
          Every call commits as a tiny on-chain memo receipt — points only, no wagering. The
          auto-resolver (next build) settles outcomes straight from chain data.
        </p>
      </div>
    </div>
  );
};
