import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChainPulse, MarketsSnap, WireEvent } from '../types';
import { POLL_MS } from '../config/constants';
import { fetchLatestAssets, fetchMarkets } from '../services/cookiescan';
import { fetchChainPulse } from '../services/rpc';
import {
  diffAssets,
  diffMarkets,
  loadEvents,
  loadSeenAssets,
  loadSnap,
  saveEvents,
  saveSeenAssets,
  saveSnap,
} from '../services/wire';

export function useWire() {
  const [events, setEvents] = useState<WireEvent[]>(() => loadEvents());
  const [pillarsSnap, setSnap] = useState<MarketsSnap | null>(() => loadSnap());
  const [pulse, setPulse] = useState<ChainPulse | null>(null);
  const [lastPoll, setLastPoll] = useState<number>(() => Date.now());
  const [polling, setPolling] = useState(false);
  const [tick, setTick] = useState(0);

  const snapRef = useRef<MarketsSnap | null>(pillarsSnap);
  const seenRef = useRef<Set<string>>(loadSeenAssets());
  const busyRef = useRef(false);

  const append = useCallback((incoming: WireEvent[]) => {
    if (!incoming.length) return;
    setEvents((prev) => {
      const merged = [...[...incoming].reverse(), ...prev].slice(0, 80);
      saveEvents(merged);
      return merged;
    });
  }, []);

  const poll = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPolling(true);
    try {
      const [markets, p, assets] = await Promise.all([
        fetchMarkets(),
        fetchChainPulse(),
        fetchLatestAssets(),
      ]);

      if (markets) {
        append(diffMarkets(snapRef.current, markets));
        snapRef.current = markets;
        setSnap(markets);
        saveSnap(markets);
      }

      if (assets.length) {
        append(diffAssets(seenRef.current, assets));
        saveSeenAssets(seenRef.current);
      }

      if (p) setPulse(p);
      setLastPoll(Date.now());
    } finally {
      busyRef.current = false;
      setPolling(false);
    }
  }, [append]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // slow re-render so "Xs ago" labels stay fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  return { events, snap: pillarsSnap, pulse, lastPoll, polling, refresh: poll, tick };
}
