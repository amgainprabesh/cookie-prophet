import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Hourglass, Loader2, XCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useLedger } from '../hooks/useLedger';
import { openCycle, lastResolvedForMarket, type LedgerMarket } from '../services/ledger';
import { callForMarket, evidenceLine } from '../services/points';
import { explorerTxUrl } from '../config/constants';
import { fmtCountdown, nextUtcMidnight, utcShort } from '../utils/format';
import type { CallPick } from '../services/memo';

// Shown only if the resolver ledger can't be loaded (fresh clone, first boot).
const FALLBACK_MARKETS: Array<Pick<LedgerMarket, 'id' | 'question' | 'rule' | 'source'>> = [
  {
    id: 'm1',
    question: 'Will a new pool appear before close?',
    rule: 'YES if the tracked pool count at close is greater than at open.',
    source: 'api.cookiescan.io/api/markets',
  },
  {
    id: 'm2',
    question: 'Will the chain advance its published slot target before close?',
    rule: 'YES if the slot at close is at least the published target higher than at open.',
    source: 'rpc.cookiescan.io getSlot',
  },
];

export const ForecastPanel: React.FC = () => {
  const { connected, publicKey, calls, sendCall, openModal } = useWallet();
  const { ledger } = useLedger();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const cycle = useMemo(() => openCycle(ledger), [ledger]);
  const markets = cycle?.markets ?? FALLBACK_MARKETS;
  const wallet = publicKey?.toBase58() ?? null;

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
          <p className="text-[11px] text-stone-500 mt-0.5">
            {cycle
              ? `${cycle.kind} cycle · settles from chain data · no oracle`
              : 'resolver initializing…'}
          </p>
        </div>
        <span className="text-[9.5px] font-extrabold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
          LIVE
        </span>
      </div>

      <div className="p-3 space-y-3">
        {markets.map((m) => {
          const closesAt = cycle?.closesAt ?? nextUtcMidnight(now);
          const mine = callForMarket(ledger, calls, wallet, m.id);
          const sending = sendingId === m.id;
          const resolved = lastResolvedForMarket(ledger, m.id);
          const myResolvedRow =
            resolved && mine && mine.cycle.id === resolved.cycle.id ? mine : null;

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
                  {cycle ? `closes in ${fmtCountdown(closesAt - now)}` : 'awaiting first cycle'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={sending || !cycle}
                    onClick={() => handle(m.id, 'YES')}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      mine?.call.pick === 'YES'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-emerald-300 bg-emerald-50/60 text-emerald-700 hover:border-emerald-500'
                    }`}
                  >
                    YES · 10 pts
                  </button>
                  <button
                    disabled={sending || !cycle}
                    onClick={() => handle(m.id, 'NO')}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      mine?.call.pick === 'NO'
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
                      <span className="text-stone-600 font-semibold">Your call: {mine.call.pick}</span>
                      <a
                        href={explorerTxUrl(mine.call.sig)}
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

              {resolved && (
                <div className="mt-2 pt-2 border-t border-cookie-100">
                  <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                    <Hourglass className="w-3 h-3 text-stone-400" />
                    <span className="text-stone-500 font-mono">last cycle {utcShort(resolved.cycle.closesAt)}:</span>
                    <span
                      className={`font-extrabold ${resolved.outcome.outcome === 'YES' ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {resolved.outcome.outcome}
                    </span>
                    <span className="text-stone-400">· {evidenceLine(m.id, resolved.outcome.evidence)}</span>
                  </div>
                  {myResolvedRow && (
                    <div className="flex items-center gap-1.5 text-[11px] mt-1">
                      {myResolvedRow.call.pick === resolved.outcome.outcome ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-stone-600 font-semibold">
                            you called {myResolvedRow.call.pick} — +10 pts
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span className="text-stone-500">you called {myResolvedRow.call.pick} — no pts</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-[11px] text-stone-500 leading-snug">
          Every call commits as a tiny on-chain memo receipt (yes — those little cookie crumbs on the
          chain). Resolution evidence for every cycle is public in{' '}
          <span className="font-mono text-[10px]">resolutions.json</span>. Points only, no wagering.
        </p>
      </div>
    </div>
  );
};
