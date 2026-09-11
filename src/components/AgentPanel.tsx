import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { useLedger } from '../hooks/useLedger';
import { openCycle, type AgentPick, type LedgerCycle } from '../services/ledger';
import { explorerTxUrl } from '../config/constants';
import { fmtCountdown, timeAgo, utcShort } from '../utils/format';

function PickRow({ id, pickData, outcome }: { id: string; pickData?: AgentPick; outcome?: 'YES' | 'NO' }) {
  if (!pickData) return null;
  const landed = outcome && outcome === pickData.pick;
  return (
    <li className="text-[11.5px] text-stone-600 leading-snug">
      <span className="font-bold text-stone-800">
        {id} → {pickData.pick}
      </span>
      {outcome && (
        <span className={`ml-1.5 font-bold ${landed ? 'text-emerald-600' : 'text-rose-500'}`}>
          (settled {outcome} — {landed ? 'called it' : 'missed'})
        </span>
      )}
      <span className="text-stone-500"> — {pickData.reason}</span>
    </li>
  );
}

export const AgentPanel: React.FC = () => {
  const { ledger } = useLedger();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const cycle = openCycle(ledger);
  const agent = cycle?.agent;

  const settled: LedgerCycle | null = ledger
    ? ([...ledger.cycles]
        .filter((c) => c.resolvedAt && c.agent?.picks && c.outcomes)
        .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))[0] ?? null)
    : null;

  return (
    <div className="rounded-2xl border border-prophet-200/80 bg-white/80 shadow-sm">
      <div className="px-4 sm:px-5 py-3.5 border-b border-prophet-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-stone-900 flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-prophet-600" />
            The Prophet
          </h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            deterministic agent · {agent ? agent.strategy : 'strategy: velocity-measurement + base-rate'}
          </p>
        </div>
        {agent?.committed ? (
          <span className="text-[9px] font-extrabold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> ON-CHAIN
          </span>
        ) : (
          <span className="text-[9px] font-extrabold tracking-wider text-prophet-700 bg-prophet-50 border border-prophet-200 rounded px-1.5 py-0.5">
            PAPER
          </span>
        )}
      </div>

      <div className="p-4">
        {!agent ? (
          <p className="text-[12px] text-stone-500 leading-snug">
            The agent publishes its picks for each cycle with its full reasoning. First picks appear
            with the next cycle snapshot.
          </p>
        ) : (
          <>
            <p className="text-[11.5px] text-stone-500 leading-snug">
              Calls for the {cycle!.kind} cycle (closes in {fmtCountdown(cycle!.closesAt - now)}).
              Deterministic — same data, same pick, anyone can re-run it.
            </p>
            <ul className="mt-2.5 space-y-2">
              <PickRow id="m1" pickData={agent.picks.m1} />
              <PickRow id="m2" pickData={agent.picks.m2} />
            </ul>

            {settled && (
              <div className="mt-3.5 pt-3 border-t border-prophet-100">
                <p className="text-[10px] font-extrabold tracking-wider text-stone-400">
                  LAST SETTLED · closed {utcShort(settled.closesAt)}
                </p>
                <ul className="mt-1.5 space-y-2">
                  <PickRow
                    id="m1"
                    pickData={settled.agent!.picks.m1}
                    outcome={settled.outcomes?.m1?.outcome}
                  />
                  <PickRow
                    id="m2"
                    pickData={settled.agent!.picks.m2}
                    outcome={settled.outcomes?.m2?.outcome}
                  />
                </ul>
              </div>
            )}

            {agent.paper && (
              <div className="mt-3.5 pt-3 border-t border-prophet-100">
                <p className="text-[10px] font-extrabold tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-prophet-400" />
                  PAPER BOOK · updated {timeAgo(agent.paper.updatedAt)}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {agent.paper.positions.map((p) => (
                    <li key={p.marketId} className="text-[11.5px] text-stone-600 flex justify-between gap-2">
                      <span className="truncate font-semibold">{p.pair}</span>
                      <span className="font-mono text-[10.5px] text-stone-400 shrink-0">
                        ${p.liquidityUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </li>
                  ))}
                </ul>
                {agent.paper.decisions.length > 0 && (
                  <p className="text-[10.5px] text-stone-400 mt-1.5 leading-snug">
                    {agent.paper.decisions[agent.paper.decisions.length - 1]}
                  </p>
                )}
              </div>
            )}

            {agent.committed && (
              <p className="mt-3 pt-2.5 border-t border-prophet-100 text-[11px] text-stone-500 flex items-center gap-1.5 flex-wrap">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                picks committed on-chain by {agent.committed.wallet.slice(0, 6)}… ·
                {Object.entries(agent.committed.sigs).map(([k, sig]) => (
                  <a
                    key={k}
                    href={explorerTxUrl(sig)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-bold text-cookie-700 hover:underline"
                  >
                    {k} receipt <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};