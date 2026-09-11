import React from 'react';
import { CheckCircle2, AlertCircle, Info, ExternalLink, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export const Toasts: React.FC = () => {
  const { toasts, removeToast } = useWallet();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(92vw,380px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-in rounded-xl border shadow-lg bg-white p-3.5 flex gap-2.5 items-start ${
            t.type === 'success'
              ? 'border-emerald-200'
              : t.type === 'error'
                ? 'border-rose-200'
                : 'border-cookie-200'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          ) : t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-cookie-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-stone-800 leading-snug">{t.title}</p>
            {t.message && <p className="text-[11.5px] text-stone-500 mt-0.5 leading-snug break-words">{t.message}</p>}
            {t.link && (
              <a
                href={t.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-cookie-700 hover:underline mt-1"
              >
                View on explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-stone-300 hover:text-stone-500 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
