import React from 'react';
import { Header } from './components/Header';
import { WireFeed } from './components/WireFeed';
import { ForecastPanel } from './components/ForecastPanel';
import { StatusPanel } from './components/StatusPanel';
import { Footer } from './components/Footer';
import { ConnectModal } from './components/ConnectModal';
import { Toasts } from './components/Toasts';
import { useWire } from './hooks/useWire';
import { WalletProvider } from './context/WalletContext';

function Shell() {
  const { events, pulse, lastPoll, polling, refresh, tick } = useWire();

  return (
    <div className="min-h-screen flex flex-col">
      <Header pulse={pulse} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2">
          <WireFeed events={events} lastPoll={lastPoll} polling={polling} refresh={refresh} tick={tick} />
        </section>
        <aside className="space-y-6">
          <ForecastPanel />
          <StatusPanel />
        </aside>
      </main>
      <Footer />
      <ConnectModal />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <Shell />
    </WalletProvider>
  );
}
