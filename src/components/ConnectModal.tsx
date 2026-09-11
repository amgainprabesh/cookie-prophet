import React from 'react';
import { Check, Copy, LogOut, Sparkles, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { CHAIN, LINKS } from '../config/constants';
import { fmtCook, short } from '../utils/format';

export const ConnectModal: React.FC = () => {
  const {
    modalOpen,
    closeModal,
    options,
    connect,
    disconnect,
    status,
    connected,
    publicKey,
    balanceCook,
    walletName,
    addToast,
  } = useWallet();

  const [copied, setCopied] = React.useState(false);

  if (!modalOpen) return null;

  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast('info', 'Copy failed', 'Select the address and copy manually.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-sm animate-fade-in"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cookie-200 bg-[#fffdfa] shadow-2xl p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cookie-50 border border-cookie-200 flex items-center justify-center text-stone-500 hover:text-stone-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {connected && publicKey ? (
          <>
            <h3 className="text-base font-extrabold text-stone-900">Your wallet</h3>
            <p className="text-[11.5px] text-stone-500 mt-0.5">{walletName} · Cookie Chain</p>

            <div className="mt-4 rounded-xl border border-cookie-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] text-stone-700 break-all">{publicKey.toBase58()}</span>
                <button onClick={copyAddress} className="shrink-0 text-stone-400 hover:text-cookie-600">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-cookie-100 flex items-center justify-between">
                <span className="text-[11.5px] text-stone-500">Balance</span>
                <span className="font-mono text-[12.5px] font-bold text-stone-800">
                  {balanceCook === null ? '…' : `${fmtCook(balanceCook)} COOK`}
                </span>
              </div>
            </div>

            {balanceCook !== null && balanceCook < 0.001 && (
              <p className="text-[11.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3 leading-snug">
                Almost no COOK for fees — bridge a little from Solana first:{' '}
                <a className="font-bold underline" href={LINKS.bridge} target="_blank" rel="noreferrer">
                  hyperlane.cookiescan.io
                </a>
              </p>
            )}

            <button
              onClick={() => {
                disconnect();
                closeModal();
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] font-bold text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <>
            <h3 className="text-base font-extrabold text-stone-900">Connect a wallet</h3>
            <p className="text-[11.5px] text-stone-500 mt-0.5">
              Calls are committed from your wallet — Cookie Chain keeps the receipt.
            </p>

            <div className="mt-4 space-y-2">
              {options.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-cookie-200 bg-white px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-stone-800">{w.name}</span>
                      {w.recommended && (
                        <span className="text-[9px] font-extrabold tracking-wider text-prophet-700 bg-prophet-50 border border-prophet-200 rounded px-1.5 py-0.5">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                      {w.installed ? (w.blurb || 'Detected in this browser') : 'Not installed'}
                    </p>
                  </div>
                  {w.installed ? (
                    <button
                      disabled={status === 'connecting'}
                      onClick={() => connect(w.id)}
                      className="shrink-0 rounded-lg bg-cookie-600 hover:bg-cookie-700 disabled:opacity-50 text-white text-[11.5px] font-bold px-3 py-1.5"
                    >
                      {status === 'connecting' ? 'Connecting…' : 'Connect'}
                    </button>
                  ) : (
                    <a
                      href={w.installUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-cookie-300 text-cookie-800 text-[11.5px] font-bold px-3 py-1.5 hover:border-cookie-500"
                    >
                      Install
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-cookie-50/70 border border-cookie-100 p-3">
              <p className="text-[10px] font-extrabold tracking-wider text-cookie-800 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                FIRST TIME? 3 STEPS
              </p>
              <ol className="mt-1.5 space-y-1 text-[11.5px] text-stone-600 list-decimal list-inside leading-snug">
                <li>
                  Install Nightly and point it at Cookie Chain:{' '}
                  <span className="font-mono text-[10.5px]">{CHAIN.rpc}</span>
                </li>
                <li>
                  Bridge a little COOK from Solana:{' '}
                  <a className="font-bold underline" href={LINKS.bridge} target="_blank" rel="noreferrer">
                    hyperlane.cookiescan.io
                  </a>
                </li>
                <li>Come back, connect, and make your first call — every one is a real on-chain memo.</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
