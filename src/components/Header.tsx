import React from 'react';
import type { ChainPulse } from '../types';
import { LINKS } from '../config/constants';
import { useWallet } from '../context/WalletContext';
import { short } from '../utils/format';

interface HeaderProps {
  pulse: ChainPulse | null;
}

export const Header: React.FC<HeaderProps> = ({ pulse }) => {
  const { connected, publicKey, balanceCook, openModal, status } = useWallet();

  return (
    <header className="sticky top-0 z-20 border-b border-cookie-200/70 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">🍪</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-stone-900 leading-none">
              Cookie Prophet
            </h1>
            <p className="text-[11px] text-stone-500 mt-0.5">forecasts &amp; the wire for Cookie Chain</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-cookie-200 bg-white px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-[11px] font-semibold text-stone-600 font-mono">
              {pulse ? `slot ${pulse.slot.toLocaleString()}` : 'connecting…'}
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-3 text-[12px] font-semibold text-stone-500">
            <a className="hover:text-cookie-700" href={LINKS.docs} target="_blank" rel="noreferrer">Docs</a>
            <a className="hover:text-cookie-700" href={LINKS.bridge} target="_blank" rel="noreferrer">Bridge</a>
          </nav>

          {connected && publicKey ? (
            <button
              onClick={openModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cookie-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-stone-700 hover:border-cookie-400"
              title="Wallet"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono">{short(publicKey.toBase58(), 4, 4)}</span>
              <span className="text-stone-300">·</span>
              <span className="font-mono text-stone-500">
                {balanceCook === null
                  ? '…'
                  : `${balanceCook.toLocaleString(undefined, { maximumFractionDigits: 3 })} COOK`}
              </span>
            </button>
          ) : (
            <button
              onClick={openModal}
              disabled={status === 'connecting'}
              className="rounded-xl bg-cookie-600 hover:bg-cookie-700 disabled:opacity-60 text-white px-3.5 py-1.5 text-[12px] font-bold shadow-sm"
            >
              {status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
