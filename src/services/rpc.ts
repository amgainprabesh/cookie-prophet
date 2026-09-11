import { Connection } from '@solana/web3.js';
import { CHAIN } from '../config/constants';
import type { ChainPulse } from '../types';

let conn: Connection | null = null;

export function getConnection(): Connection {
  if (!conn) {
    conn = new Connection(CHAIN.rpc, { commitment: 'confirmed' });
  }
  return conn;
}

export async function fetchChainPulse(): Promise<ChainPulse | null> {
  try {
    const c = getConnection();
    const [slot, version] = await Promise.all([
      c.getSlot('confirmed'),
      c.getVersion().catch(() => null),
    ]);
    return {
      slot,
      version: (version as any)?.['solana-core'] || '—',
    };
  } catch {
    return null;
  }
}
