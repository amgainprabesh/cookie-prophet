import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getConnection } from '../services/rpc';
import { buildCallMemo, buildMemoInstruction, type CallPick } from '../services/memo';
import { connectWallet, listWalletOptions, type Connector, type WalletOption } from '../services/wallet';
import { LINKS, LS, explorerTxUrl } from '../config/constants';
import type { CallRecord } from '../types';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  link?: string;
}

interface WalletContextValue {
  status: 'disconnected' | 'connecting' | 'connected';
  connected: boolean;
  publicKey: PublicKey | null;
  walletName: string;
  balanceCook: number | null;
  options: WalletOption[];
  calls: CallRecord[];
  toasts: Toast[];
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (id: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendCall: (marketId: string, pick: CallPick) => Promise<string | null>;
  addToast: (type: Toast['type'], title: string, message?: string, link?: string) => void;
  removeToast: (id: string) => void;
}

const WalletContext = createContext<WalletContextValue>({
  status: 'disconnected',
  connected: false,
  publicKey: null,
  walletName: '',
  balanceCook: null,
  options: [],
  calls: [],
  toasts: [],
  modalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  connect: async () => {},
  disconnect: async () => {},
  sendCall: async () => null,
  addToast: () => {},
  removeToast: () => {},
});

function loadCalls(): CallRecord[] {
  try {
    const raw = localStorage.getItem(LS.calls);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveCalls(calls: CallRecord[]): void {
  try {
    localStorage.setItem(LS.calls, JSON.stringify(calls.slice(0, 200)));
  } catch {}
}

function humanizeError(e: unknown): string {
  const m = String((e as any)?.message || e || '');
  if (/reject|denied|cancel/i.test(m)) return 'You canceled the request in your wallet.';
  if (/insufficient|lamports|balance/i.test(m)) {
    return `Not enough COOK for the network fee — bridge a little from Solana first (${LINKS.bridge}).`;
  }
  if (/blockhash/i.test(m)) return 'The network moved on before signing — please try again.';
  return m.slice(0, 200) || 'Unknown error.';
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [walletName, setWalletName] = useState<string>('');
  const [balanceCook, setBalanceCook] = useState<number | null>(null);
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>(() => loadCalls());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const connectorRef = useRef<Connector | null>(null);

  const addToast = useCallback((type: Toast['type'], title: string, message?: string, link?: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, link }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshBalance = useCallback(async (pk?: PublicKey | null) => {
    const target = pk ?? connectorRef.current?.publicKey;
    if (!target) return;
    try {
      const lamports = await getConnection().getBalance(target, 'confirmed');
      setBalanceCook(lamports / 1e9);
    } catch {
      setBalanceCook(null);
    }
  }, []);

  const adoptConnector = useCallback(
    async (c: Connector) => {
      connectorRef.current = c;
      setPublicKey(c.publicKey);
      setWalletName(c.name);
      setStatus('connected');
      try {
        localStorage.setItem(LS.wallet, c.id);
      } catch {}
      refreshBalance(c.publicKey);
    },
    [refreshBalance]
  );

  const connect = useCallback(
    async (id: string) => {
      setStatus('connecting');
      try {
        const c = await connectWallet(id, {});
        await adoptConnector(c);
        addToast('success', `${c.name} connected`, `${c.publicKey.toBase58().slice(0, 6)}… on Cookie Chain`);
        setModalOpen(false);
      } catch (e) {
        addToast('error', 'Connection failed', humanizeError(e));
        setStatus('disconnected');
      }
    },
    [adoptConnector, addToast]
  );

  const disconnect = useCallback(async () => {
    try {
      await connectorRef.current?.disconnect();
    } catch {}
    connectorRef.current = null;
    setPublicKey(null);
    setWalletName('');
    setBalanceCook(null);
    setStatus('disconnected');
    try {
      localStorage.removeItem(LS.wallet);
    } catch {}
    addToast('info', 'Wallet disconnected');
  }, [addToast]);

  // silent reconnect on load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(LS.wallet);
      } catch {}
      if (!saved) return;
      try {
        const c = await connectWallet(saved, { silent: true });
        if (cancelled) return;
        await adoptConnector(c);
      } catch {
        /* stays disconnected — user can connect manually */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adoptConnector]);

  const sendCall = useCallback(
    async (marketId: string, pick: CallPick): Promise<string | null> => {
      const c = connectorRef.current;
      if (!c) {
        setModalOpen(true);
        return null;
      }
      const conn: Connection = getConnection();
      try {
        const tx = new Transaction().add(buildMemoInstruction(buildCallMemo(marketId, pick)));
        tx.feePayer = c.publicKey;
        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;

        const signedBytes = await c.signSerialized(tx);

        addToast('info', 'Submitting your call…', 'sending the receipt to Cookie Chain');
        const sig = await conn.sendRawTransaction(signedBytes, { skipPreflight: false });
        await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

        const rec: CallRecord = {
          marketId,
          pick,
          sig,
          ts: Date.now(),
          wallet: c.publicKey.toBase58(),
        };
        setCalls((prev) => {
          const next = [rec, ...prev].slice(0, 200);
          saveCalls(next);
          return next;
        });

        addToast(
          'success',
          `Call committed: ${pick}`,
          `Your receipt is on the blockchain — ${sig.slice(0, 8)}…`,
          explorerTxUrl(sig)
        );
        refreshBalance(c.publicKey);
        return sig;
      } catch (e) {
        addToast('error', 'Commit failed', humanizeError(e));
        return null;
      }
    },
    [addToast, refreshBalance]
  );

  const openModal = useCallback(() => {
    setOptions(listWalletOptions());
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  // scan installed wallets on mount too
  useEffect(() => {
    setOptions(listWalletOptions());
  }, []);

  return (
    <WalletContext.Provider
      value={{
        status,
        connected: status === 'connected' && !!publicKey,
        publicKey,
        walletName,
        balanceCook,
        options,
        calls,
        toasts,
        modalOpen,
        openModal,
        closeModal,
        connect,
        disconnect,
        sendCall,
        addToast,
        removeToast,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
