import { PublicKey, Transaction } from '@solana/web3.js';

export type WalletKind = 'nightly-standard' | 'legacy' | 'none';

export interface WalletOption {
  id: string;
  name: string;
  installUrl: string;
  recommended?: boolean;
  blurb?: string;
  installed: boolean;
  kind: WalletKind;
}

declare global {
  interface Window {
    nightly?: any;
    phantom?: any;
    solflare?: any;
    backpack?: any;
    solana?: any;
  }
}

export function getNightlyProvider(): any | null {
  const w = window as any;
  const n = w?.nightly?.solana ?? (w?.nightly?.connect || w?.nightly?.features ? w.nightly : null);
  return n ?? null;
}

function hasStandardConnect(p: any): boolean {
  return !!p?.features?.['standard:connect']?.connect;
}

function legacyReady(p: any): boolean {
  return !!(p?.connect && p?.signTransaction);
}

function getPhantomProvider(): any | null {
  const w = window as any;
  return w?.phantom?.solana ?? (w?.solana?.isPhantom ? w.solana : null);
}

function getSolflareProvider(): any | null {
  const w = window as any;
  return w?.solflare ?? (w?.solana?.isSolflare ? w.solana : null);
}

function getBackpackProvider(): any | null {
  const w = window as any;
  return w?.backpack ?? null;
}

function getInjectedProvider(): any | null {
  const w = window as any;
  return w?.solana ?? null;
}

// Re-scan on demand: extensions can inject after page load.
export function listWalletOptions(): WalletOption[] {
  const nightly = getNightlyProvider();
  const phantom = getPhantomProvider();
  const solflare = getSolflareProvider();
  const backpack = getBackpackProvider();
  const injected = getInjectedProvider();

  const nightlyKind: WalletKind = nightly
    ? hasStandardConnect(nightly)
      ? 'nightly-standard'
      : legacyReady(nightly)
        ? 'legacy'
        : 'none'
    : 'none';

  const legacyOrNone = (p: any): WalletKind => (p && legacyReady(p) ? 'legacy' : 'none');

  return [
    {
      id: 'nightly',
      name: 'Nightly',
      installUrl: 'https://nightly.app',
      recommended: true,
      blurb: 'Primary support target — full Cookie Chain support',
      installed: nightlyKind !== 'none',
      kind: nightlyKind,
    },
    {
      id: 'phantom',
      name: 'Phantom',
      installUrl: 'https://phantom.app',
      installed: legacyOrNone(phantom) !== 'none',
      kind: legacyOrNone(phantom),
    },
    {
      id: 'solflare',
      name: 'Solflare',
      installUrl: 'https://solflare.com',
      installed: legacyOrNone(solflare) !== 'none',
      kind: legacyOrNone(solflare),
    },
    {
      id: 'backpack',
      name: 'Backpack',
      installUrl: 'https://backpack.app',
      installed: legacyOrNone(backpack) !== 'none',
      kind: legacyOrNone(backpack),
    },
    {
      id: 'injected',
      name: 'Other Solana wallet',
      installUrl: 'https://solana.com/ecosystem/wallets',
      installed: legacyOrNone(injected) !== 'none' && !phantom && !solflare,
      kind: !phantom && !solflare ? legacyOrNone(injected) : 'none',
    },
  ];
}

export interface ConnectorEvents {
  /** The wallet itself ended the session (user disconnected in the extension). */
  onDisconnect: () => void;
  /** The wallet switched to a different account. */
  onAccountChanged: (pk: PublicKey) => void;
}

export interface Connector {
  id: string;
  name: string;
  publicKey: PublicKey;
  /** Sign a fully-built transaction; resolves to serialized signed bytes. */
  signSerialized(tx: Transaction): Promise<Uint8Array>;
  disconnect(): Promise<void>;
  /**
   * Watch wallet-originated events. Returns an unsubscribe function,
   * or null when the wallet doesn't support events.
   */
  subscribe?(handlers: ConnectorEvents): (() => void) | null;
}

const NAMES: Record<string, string> = {
  nightly: 'Nightly',
  phantom: 'Phantom',
  solflare: 'Solflare',
  backpack: 'Backpack',
  injected: 'Solana wallet',
};

export async function connectWallet(id: string, opts: { silent?: boolean } = {}): Promise<Connector> {
  if (id === 'nightly') return connectNightly(opts);
  const raw =
    id === 'phantom'
      ? getPhantomProvider()
      : id === 'solflare'
        ? getSolflareProvider()
        : id === 'backpack'
          ? getBackpackProvider()
          : getInjectedProvider();
  if (!raw || !legacyReady(raw)) {
    throw new Error(`${NAMES[id] || id} was not detected in this browser.`);
  }
  return connectLegacy(id, raw, opts);
}

/**
 * Nightly (docs.nightly.app): wallet-standard flow —
 *   window.nightly.solana.features['standard:connect'].connect()
 *   window.nightly.solana.features['solana:signTransaction'].signTransaction(...)
 * with a fallback to the legacy provider API when features are absent.
 */
async function connectNightly(opts: { silent?: boolean }): Promise<Connector> {
  const n = getNightlyProvider();
  if (!n) throw new Error('Nightly was not detected — install it from nightly.app, then refresh.');

  if (hasStandardConnect(n)) {
    const connectFeature = n.features['standard:connect'];
    const res = await connectFeature.connect(opts.silent ? { silent: true } : undefined);
    const account = res?.accounts?.[0];
    if (!account?.address) throw new Error('Nightly returned no account.');
    const pk = new PublicKey(account.address);
    const signFeature = n.features?.['solana:signTransaction'];

    // holder keeps the live account so account switches are reflected
    const holder: { account: any } = { account };

    const connector: Connector = {
      id: 'nightly',
      name: 'Nightly',
      publicKey: pk,
      signSerialized: async (tx: Transaction) => {
        if (!signFeature?.signTransaction) {
          throw new Error('Nightly exposes no transaction signing feature.');
        }
        const transaction = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        const input: any = { account: holder.account, transaction };
        let out: any;
        try {
          out = await signFeature.signTransaction(input);
        } catch {
          // some wallets want the chain identifier explicitly
          out = await signFeature.signTransaction({ ...input, chain: holder.account?.chains?.[0] });
        }
        const signed = out?.[0]?.signedTransaction;
        if (!signed) throw new Error('Nightly did not return a signed transaction.');
        return signed as Uint8Array;
      },
      disconnect: async () => {
        try {
          await n.features?.['standard:disconnect']?.disconnect?.();
        } catch {}
      },
      subscribe: (handlers: ConnectorEvents) => {
        const events = n.features?.['standard:events'];
        if (!events?.on) return null;
        const listener = (props: any) => {
          const accounts = props?.accounts;
          if (!accounts || accounts.length === 0) {
            try {
              handlers.onDisconnect();
            } catch {}
            return;
          }
          const acc = accounts[0];
          if (acc?.address && acc.address !== holder.account?.address) {
            holder.account = acc;
            try {
              const newPk = new PublicKey(acc.address);
              connector.publicKey = newPk;
              handlers.onAccountChanged(newPk);
            } catch {}
          }
        };
        try {
          events.on('change', listener);
        } catch {
          return null;
        }
        return () => {
          try {
            events.off?.('change', listener);
          } catch {}
        };
      },
    };
    return connector;
  }

  if (legacyReady(n)) return connectLegacy('nightly', n, opts);
  throw new Error('Nightly provider found, but it exposes neither the wallet-standard nor the legacy API.');
}

async function connectLegacy(id: string, raw: any, opts: { silent?: boolean }): Promise<Connector> {
  let res: any;
  try {
    res = await raw.connect(opts.silent ? { onlyIfTrusted: true } : undefined);
  } catch (e) {
    if (opts.silent) throw e;
    throw new Error(`Could not connect ${NAMES[id] || id}: ${(e as Error)?.message || 'request rejected'}`);
  }
  const pkRaw = res?.publicKey ?? raw.publicKey;
  if (!pkRaw) throw new Error(`${NAMES[id] || id} returned no public key.`);
  const pk = new PublicKey(pkRaw.toString());

  const holder: { pk: PublicKey } = { pk };

  const connector: Connector = {
    id,
    name: NAMES[id] || id,
    publicKey: pk,
    signSerialized: async (tx: Transaction) => {
      const signed = await raw.signTransaction(tx);
      return signed.serialize();
    },
    disconnect: async () => {
      try {
        await raw.disconnect?.();
      } catch {}
    },
    subscribe: (handlers: ConnectorEvents) => {
      if (typeof raw.on !== 'function') return null;
      const offs: Array<() => void> = [];
      const onDis = () => {
        try {
          handlers.onDisconnect();
        } catch {}
      };
      const onAcct = (newPk: any) => {
        if (!newPk) {
          try {
            handlers.onDisconnect();
          } catch {}
          return;
        }
        try {
          const p = new PublicKey(newPk.toString());
          holder.pk = p;
          connector.publicKey = p;
          handlers.onAccountChanged(p);
        } catch {}
      };
      try {
        raw.on('disconnect', onDis);
        offs.push(() => {
          try {
            raw.off?.('disconnect', onDis);
          } catch {}
        });
        raw.on('accountChanged', onAcct);
        offs.push(() => {
          try {
            raw.off?.('accountChanged', onAcct);
          } catch {}
        });
      } catch {
        return null;
      }
      return () => offs.forEach((f) => f());
    },
  };
  return connector;
}