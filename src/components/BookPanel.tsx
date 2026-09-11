import React, { useMemo } from 'react';
import { CheckCircle2, ExternalLink, Hourglass, XCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useLedger } from '../hooks/useLedger';
import { computeBook } from '../services/points';
import { explorerTxUrl } from '../config/constants';
import { utcShort } from '../utils/format';

export const BookPanel: React.FC = () => {
  const { connected, publicKey, calls, openModal } = useWallet();
  const { ledger } = useLedger();

  const wallet = publicKey?.toBase58() ?? null;
  const book = useMemo(() => computeBook(ledger, calls, wallet), [ledger, calls, wallet]);

  return (
    <div className="rounded-2xl border border-cookie-200/80 bg-white/80 shadow-sm">
      <div className="px-4 sm:px-5 py-3.5 border-b border-cookie-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-stone-900">Your Book</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">correct call = 10 pts · receipts on-chain</p>
        </div>
        {book.streak > 0 && (
          <span className="text-[10px] font-extrabold tracking-wider text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            🔥 STREAK {book.streak}
          </span>
        )}
      </div>

      <div className="p-4">
        {!connected ? (
          <button
            onClick={openModal}
            className="w-full rounded-xl border border-cookie-200 bg-white px-3 py-3 text-[12.5px] font-bold text-stone-600 hover:border-cookie-400"
          >
            Connect a wallet to start your book →
          </button>
        ) : book.rows.length === 0 ? (
          <p className="text-[12px] text-stone-500 leading-snug">
            No calls yet. Pick a side on a forecast above — your first call lands on-chain as a
            receipt.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-cookie-200 bg-white p-2.5 text-center">
                <div className="text-lg font-extrabold text-stone-900 leading-none">{book.points}</div>
                <div className="text-[10px] font-bold tracking-wider text-stone-400 mt-1">POINTS</div>
              </div>
              <div className="rounded-xl border border-cookie-200 bg-white p-2.5 text-center">
                <div className="text-lg font-extrabold text-stone-900 leading-none">{book.streak}</div>
                <div className="text-[10px] font-bold tracking-wider text-stone-400 mt-1">STREAK</div>
              </div>
              <div className="rounded-xl border border-cookie-200 bg-white p-2.5 text-center">
                <div className="text-lg font-extrabold text-stone-900 leading-none">
                  {book.correct}/{book.calls}
                </div>
                <div className="text-[10px] font-bold tracking-wider text-stone-400 mt-1">CALLED</div>
              </div>
            </div>

            <ul className="mt-3 space-y-1.5">
              {book.rows.slice(0, 6).map((row) => (
                <li
                  key={`${row.marketId}-${row.closesAt}-${row.sig}`}
                  className="flex items-center gap-1.5 text-[11px] text-stone-600"
                >
                  {row.outcome === null ? (
                    <Hourglass className="w-3 h-3 text-stone-300 shrink-0" />
                  ) : row.correct ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  )}
                  <span className="truncate">
                    {row.marketId} · {row.pick}
                    {row.outcome ? ` → ${row.outcome}` : ' (pending)'}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-stone-400 shrink-0">
                    {utcShort(row.closesAt)}
                  </span>
                  <a
                    href={explorerTxUrl(row.sig)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-300 hover:text-cookie-600 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
            {book.rows.length > 6 && (
              <p className="text-[10px] text-stone-400 mt-2">+{book.rows.length - 6} more in your ledger</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
