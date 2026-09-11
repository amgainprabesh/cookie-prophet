import React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { WireEvent, WireKind } from '../types';
import { clockTime, timeAgo } from '../utils/format';

const KIND_STYLE: Record<WireKind, string> = {
  SYSTEM: 'bg-stone-100 text-stone-600 border-stone-200',
  POOL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FLOW: 'bg-sky-50 text-sky-700 border-sky-200',
  PRICE: 'bg-pink-50 text-pink-700 border-pink-200',
  LAUNCH: 'bg-amber-50 text-amber-700 border-amber-200',
  CHAIN: 'bg-violet-50 text-violet-700 border-violet-200',
  AGENT: 'bg-prophet-50 text-prophet-700 border-prophet-200',
};

interface WireFeedProps {
  events: WireEvent[];
  lastPoll: number;
  polling: boolean;
  refresh: () => void;
  /** changes every 15s so relative timestamps re-render */
  tick: number;
}

export const WireFeed: React.FC<WireFeedProps> = ({ events, lastPoll, polling, refresh, tick }) => {
  void tick;
  return (
    <div className="rounded-2xl border border-cookie-200/80 bg-white/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-cookie-100">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            The Wire
          </h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            live from Cookie Chain · updates every 25s · last reading {timeAgo(lastPoll)}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={polling}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cookie-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 hover:border-cookie-400 hover:text-cookie-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="max-h-[560px] overflow-y-auto px-2 sm:px-3 py-2">
        {events.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-sm font-semibold text-stone-600">Listening to the chain…</p>
            <p className="text-[12px] text-stone-400 mt-1">
              First events appear within a minute — pools, flows, launches.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cookie-100/70">
            {events.slice(0, 40).map((e) => (
              <li key={e.id} className="flex gap-3 px-2 sm:px-3 py-2.5 animate-fade-in">
                <span className="text-[10.5px] font-mono font-semibold text-stone-400 pt-0.5 w-10 shrink-0">
                  {clockTime(e.ts)}
                </span>
                <span
                  className={`text-[9px] font-extrabold tracking-wider border rounded px-1.5 py-0.5 h-fit shrink-0 ${KIND_STYLE[e.kind]}`}
                >
                  {e.kind}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-stone-800 leading-snug">{e.title}</p>
                  {e.detail && <p className="text-[11.5px] text-stone-500 mt-0.5 leading-snug">{e.detail}</p>}
                </div>
                {e.link && (
                  <a
                    href={e.link}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto shrink-0 self-center text-stone-300 hover:text-cookie-600"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
