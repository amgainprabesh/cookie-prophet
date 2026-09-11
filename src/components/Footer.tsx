import React from 'react';
import { LINKS } from '../config/constants';

export const Footer: React.FC = () => (
  <footer className="border-t border-cookie-200/70 mt-10">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p className="text-[11.5px] text-stone-500">
        Built for the Cookie Chain cApp bounty · Points &amp; badges only — no wagering.
      </p>
      <nav className="flex flex-wrap items-center gap-3 text-[11.5px] font-semibold text-stone-500">
        <a className="hover:text-cookie-700" href={LINKS.cookieswap} target="_blank" rel="noreferrer">CookieSwap</a>
        <a className="hover:text-cookie-700" href={LINKS.candyShop} target="_blank" rel="noreferrer">Candy Shop</a>
        <a className="hover:text-cookie-700" href={LINKS.nightly} target="_blank" rel="noreferrer">Nightly</a>
        <a className="hover:text-cookie-700" href={LINKS.telegram} target="_blank" rel="noreferrer">Telegram</a>
      </nav>
    </div>
  </footer>
);
