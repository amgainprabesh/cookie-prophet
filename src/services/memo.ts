import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { MEMO_PREFIX, MEMO_PROGRAM_ID } from '../config/constants';

export type CallPick = 'YES' | 'NO';

/**
 * Memo format (stable, parseable by the future indexer/resolver):
 *   cookie-prophet:v1:<marketId>:<YES|NO>
 */
export function buildCallMemo(marketId: string, pick: CallPick): string {
  return `${MEMO_PREFIX}:v1:${marketId}:${pick}`;
}

export function buildMemoInstruction(memo: string): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    // Buffer is provided by vite-plugin-node-polyfills in the browser
    data: Buffer.from(memo, 'utf8'),
  });
}

export function parseCallMemo(text: string): { marketId: string; pick: CallPick } | null {
  const m = text.match(new RegExp(`^${MEMO_PREFIX}:v1:([a-zA-Z0-9_-]+):(YES|NO)$`));
  if (!m) return null;
  return { marketId: m[1], pick: m[2].toUpperCase() as CallPick };
}
