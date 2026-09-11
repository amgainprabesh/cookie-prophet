import React from 'react';
import type { ChainPulse } from '../types';
import { LINKS } from '../config/constants';

interface HeaderProps {
  pulse: ChainPulse | null;
}

export const Header: React.FC<HeaderProps> = ({ pulse }) => {
  return (
    <header className="sticky top-0 z-20 border-b border-cookie-200/70 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
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
          <nav className="hidden md:flex items-center gap-3 text-[12px] font-semibold text-stone-500">
            <a className="hover:text-cookie-700" href={LINKS.docs} target="_blank" rel="noreferrer">Docs</a>
            <a className="hover:text-cookie-700" href={LINKS.bridge} target="_blank" rel="noreferrer">Bridge</a>
            <a className="hover:text-cookie-700" href={LINKS.cookiechain} target="_blank" rel="noreferrer">Cookie Chain</a>
          </nav>
        </div>
      </div>
    </header>
  );
};
