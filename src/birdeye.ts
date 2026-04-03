/**
 * Birdeye API Client — Free Tier Compatible
 * Rate limited to ~1 req/sec to stay within free plan limits
 */

import 'dotenv/config';

const BASE_URL = 'https://public-api.birdeye.so';
const API_KEY = process.env.BIRDEYE_API_KEY;

if (!API_KEY) {
  throw new Error('BIRDEYE_API_KEY not set in .env — get one free at bds.birdeye.so');
}

const headers: Record<string, string> = {
  'X-API-KEY': API_KEY,
  'x-chain': 'solana',
  'Accept': 'application/json',
};

let callCount = 0;
let lastCallTime = 0;
const MIN_INTERVAL_MS = 1500; // 1.5s between calls

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastCallTime = Date.now();
}

async function birdeyeGet(path: string, params?: Record<string, string>) {
  await rateLimit();
  
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  
  const res = await fetch(url.toString(), { headers });
  callCount++;
  
  if (res.status === 429) {
    // Rate limited — wait and retry once
    console.log(`  ⏱️ Rate limited on ${path}, waiting 3s...`);
    await new Promise(r => setTimeout(r, 3000));
    const retry = await fetch(url.toString(), { headers });
    callCount++;
    if (!retry.ok) {
      throw new Error(`Birdeye ${retry.status} on ${path} (after retry)`);
    }
    return retry.json();
  }
  
  if (!res.ok) {
    throw new Error(`Birdeye ${res.status} on ${path}`);
  }
  return res.json();
}

export function getCallCount() { return callCount; }

// ═══════════════════════════════════════════
// FREE TIER — Discovery endpoints
// ═══════════════════════════════════════════

/** Trending tokens — our primary seed source */
export async function getTrendingTokens(limit = 20) {
  return birdeyeGet('/defi/token_trending', {
    sort_by: 'rank',
    sort_type: 'asc',
    offset: '0',
    limit: String(limit),
  });
}

/** New listings */
export async function getNewListings(limit = 20) {
  return birdeyeGet('/defi/v2/tokens/new_listing', { limit: String(limit) });
}

/** Meme tokens */
export async function getMemeTokens(limit = 20) {
  return birdeyeGet('/defi/v3/token/meme/list', { limit: String(limit) });
}

/** Top gainers/losers */
export async function getTopMovers(limit = 10, direction: 'desc' | 'asc' = 'desc') {
  return birdeyeGet('/defi/v3/token/list', {
    sort_by: 'price_change_24h_percent',
    sort_type: direction,
    limit: String(limit),
  });
}

/** Search for token */
export async function searchToken(keyword: string) {
  return birdeyeGet('/defi/v3/search', { keyword });
}

// ═══════════════════════════════════════════
// FREE TIER — Wallet intelligence (core of WhaleMesh)
// ═══════════════════════════════════════════

/** Top traders for a token — THE key endpoint for graph construction */
export async function getTopTraders(tokenAddress: string, timeframe = '24h') {
  return birdeyeGet('/defi/v2/tokens/top_traders', {
    address: tokenAddress,
    time_frame: timeframe,
  });
}

/** Wallet PnL summary — verify profitability */
export async function getWalletPnL(wallet: string) {
  return birdeyeGet('/wallet/v2/pnl/summary', { wallet });
}

/** Wallet net worth */
export async function getWalletNetWorth(wallet: string) {
  return birdeyeGet('/wallet/v2/current-net-worth', { wallet });
}

// ═══════════════════════════════════════════
// FREE TIER — Token analysis
// ═══════════════════════════════════════════

/** Token overview — price, volume, mcap, liquidity */
export async function getTokenOverview(address: string) {
  return birdeyeGet('/defi/token_overview', { address });
}

/** Token price */
export async function getTokenPrice(address: string) {
  return birdeyeGet('/defi/price', { address });
}

/** Token trades */
export async function getTokenTrades(address: string, limit = 50) {
  return birdeyeGet('/defi/txs/token', {
    address,
    limit: String(limit),
  });
}

/** OHLCV data */
export async function getOHLCV(address: string, type = '1H', limit = 24) {
  return birdeyeGet('/defi/ohlcv', {
    address,
    type,
    limit: String(limit),
  });
}

/** Price history */
export async function getPriceHistory(address: string, type = '1H') {
  return birdeyeGet('/defi/history_price', {
    address,
    address_type: 'token',
    type,
  });
}
