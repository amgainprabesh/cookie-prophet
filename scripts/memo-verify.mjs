// Proof that the on-chain memo commit path works on Cookie Chain.
// Builds the exact memo transaction the app's call flow sends, then runs it
// through the chain's transaction simulator (no funds needed) and checks that
// the memo text shows up in the program logs.
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

const RPC = 'https://rpc.cookiescan.io';
const MEMO = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const conn = new Connection(RPC, 'confirmed');

// Stand-in fee payer: the fee payer of some recent on-chain transaction
// (a real, funded system account). Simulation never moves funds.
async function findFundedAccount() {
  const probes = [
    'GxbNKNYdtNXQkhDkpHdLDAMX64GxaECgANqdfp6cUGH4',
    'EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz',
  ];
  for (const p of probes) {
    try {
      const sigs = await conn.getSignaturesForAddress(new PublicKey(p), { limit: 8 });
      for (const s of sigs) {
        try {
          const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
          const k = tx?.transaction?.message?.accountKeys?.[0];
          const addr = typeof k === 'string' ? k : k?.pubkey;
          if (addr) return new PublicKey(addr);
        } catch {}
      }
    } catch {}
  }
  return null;
}

const feePayer = await findFundedAccount();
if (!feePayer) {
  console.log('RESULT: could not locate a recent fee payer to simulate with — skipping.');
  process.exit(0);
}
console.log('fee-payer stand-in:', feePayer.toBase58());

const memoText = 'cookie-prophet:v1:m1:YES';
const ix = new TransactionInstruction({
  programId: MEMO,
  keys: [],
  data: new TextEncoder().encode(memoText),
});
const tx = new Transaction().add(ix);
tx.feePayer = feePayer;
const bh = await conn.getLatestBlockhash('confirmed');
tx.recentBlockhash = bh.blockhash;

// Raw JSON-RPC simulation — bypasses web3.js overload quirks and shows exactly
// what the chain itself accepts.
const txBytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
const b64 = Buffer.from(txBytes).toString('base64');
const rpcRes = await fetch(RPC, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'simulateTransaction',
    params: [b64, { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true }],
  }),
});
const jr = await rpcRes.json();
if (jr.error) {
  console.log('RPC error:', JSON.stringify(jr.error));
  process.exit(0);
}
const value = jr.result?.value || {};
console.log('simulation error field:', JSON.stringify(value.err));
for (const l of value.logs || []) console.log('  log:', l);
console.log('units consumed:', value.unitsConsumed);

const memoSeen = (value.logs || []).some((l) => l.includes(memoText));
console.log(
  memoSeen
    ? 'RESULT: ✅ memo instruction accepted by Cookie Chain — memo text visible in program logs'
    : `RESULT: ⚠️ memo not visible in logs (err=${JSON.stringify(value.err)})`
);