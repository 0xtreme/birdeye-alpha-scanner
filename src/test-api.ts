/**
 * API endpoint audit — with rate limiting between calls
 */

import 'dotenv/config';

const BASE_URL = 'https://public-api.birdeye.so';
const API_KEY = process.env.BIRDEYE_API_KEY!;
const headers = { 'X-API-KEY': API_KEY, 'x-chain': 'solana', 'Accept': 'application/json' };

const SOL = 'So11111111111111111111111111111111111111112';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const WALLET = '7rhxnLV8C76bFLBF7jLdMaNrrdNikHabpfCfenqiGRvE';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function test(name: string, path: string, params?: Record<string, string>) {
  await sleep(1200); // 1.2s between calls to avoid rate limit
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), { headers });
    if (res.ok) {
      console.log(`✅ ${name}`);
      return 'pass';
    } else {
      const text = await res.text();
      const is401 = res.status === 401;
      const is429 = res.status === 429;
      const tag = is401 ? 'PAID ONLY' : is429 ? 'RATE LIMITED' : `${res.status}`;
      console.log(`❌ ${name} — ${tag}`);
      return is401 ? 'paid' : is429 ? 'ratelimit' : 'fail';
    }
  } catch (e: any) {
    console.log(`❌ ${name} — ERROR`);
    return 'fail';
  }
}

async function main() {
  console.log('🔍 WhaleMesh — Free Tier Audit (with rate limit delays)\n');

  const results: string[] = [];

  // Core endpoints for WhaleMesh
  console.log('── CORE (needed for WhaleMesh) ──');
  results.push(await test('Price', '/defi/price', { address: SOL }));
  results.push(await test('Token Overview', '/defi/token_overview', { address: BONK }));
  results.push(await test('Trending Tokens', '/defi/token_trending', { sort_by: 'rank', sort_type: 'asc', limit: '5' }));
  results.push(await test('Top Traders', '/defi/v2/tokens/top_traders', { address: BONK }));
  results.push(await test('New Listings', '/defi/v2/tokens/new_listing', { limit: '5' }));
  results.push(await test('Trades - Token', '/defi/txs/token', { address: BONK, limit: '5' }));
  results.push(await test('Search', '/defi/v3/search', { keyword: 'BONK' }));
  results.push(await test('Gainers/Losers', '/defi/v3/token/list', { sort_by: 'price_change_24h_percent', sort_type: 'desc', limit: '5' }));
  results.push(await test('Price History', '/defi/history_price', { address: SOL, address_type: 'token', type: '1H' }));
  results.push(await test('OHLCV', '/defi/ohlcv', { address: SOL, type: '1H' }));

  console.log('\n── WALLET (needed for PnL verification) ──');
  results.push(await test('Wallet PnL Summary', '/wallet/v2/pnl/summary', { wallet: WALLET }));
  results.push(await test('Wallet Net Worth', '/wallet/v2/current-net-worth', { wallet: WALLET }));
  results.push(await test('Wallet PnL Token', '/wallet/v2/pnl', { wallet: WALLET }));
  results.push(await test('Wallet TX List', '/v1/wallet/tx_list', { wallet: WALLET }));

  console.log('\n── PREMIUM (likely paid-only) ──');
  results.push(await test('Token Security', '/defi/token_security', { address: SOL }));
  results.push(await test('Smart Money Tokens', '/smart-money/v1/token/list'));
  results.push(await test('Holder Distribution', '/holder/v1/distribution', { address: BONK }));
  results.push(await test('Meme Token List', '/defi/v3/token/meme/list', { limit: '5' }));

  const pass = results.filter(r => r === 'pass').length;
  const paid = results.filter(r => r === 'paid').length;
  const rl = results.filter(r => r === 'ratelimit').length;
  const fail = results.filter(r => r === 'fail').length;

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Free: ${pass} | 💰 Paid: ${paid} | ⏱️ Rate limited: ${rl} | ❌ Error: ${fail}`);
  console.log(`${'═'.repeat(50)}`);
}

main();
