export const CHAIN = {
  rpc: 'https://rpc.cookiescan.io',
  wss: 'https://wss.cookiescan.io',
  explorer: 'https://cookiescan.io',
  marketsApi: 'https://api.cookiescan.io/api/markets',
  das: 'https://api.cookiescan.io',
} as const;

export const LINKS = {
  cookiechain: 'https://cookiechain.wtf',
  docs: 'https://docs.cookiechain.wtf',
  bridge: 'https://hyperlane.cookiescan.io',
  nightly: 'https://nightly.app',
  cookieswap: 'https://cookieswap.fun',
  candyShop: 'https://swap.cookiescan.io',
  telegram: 'https://t.me/TheCookieNetChain',
} as const;

export const POLL_MS = 25_000;

export const LS = {
  events: 'cp_v1_events',
  snap: 'cp_v1_snap',
  seenAssets: 'cp_v1_seen_assets',
} as const;

export function explorerTxUrl(sig: string): string {
  return `${CHAIN.explorer}/tx/${sig}`;
}

export function explorerTokenUrl(mint: string): string {
  return `${CHAIN.explorer}/token/${mint}`;
}

export function explorerAddressUrl(addr: string): string {
  return `${CHAIN.explorer}/address/${addr}`;
}
