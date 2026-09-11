import { useEffect, useState } from 'react';
import { fetchLedger, type Ledger } from '../services/ledger';

export function useLedger() {
  const [ledger, setLedger] = useState<Ledger | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const l = await fetchLedger();
      if (live && l) setLedger(l);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  return { ledger };
}
