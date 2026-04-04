/**
 * WhaleMesh Scanner — Full pipeline
 */

import { buildGraph } from './graph.js';
import {
  findConvergenceCandidates,
  scoreConvergence,
  generateSignals,
  printSignals,
} from './convergence.js';
import { getTrendingTokens, getNewListings, getMemeTokens, getCallCount } from './birdeye.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

async function scan() {
  const start = Date.now();
  console.log('🕸️  WhaleMesh v0.1.0 — Smart Money Convergence Detector');
  console.log(`   ${new Date().toISOString()}\n`);
  
  // Phase 1: Build graph
  const graph = await buildGraph();
  
  // Phase 2: Fresh scan targets
  console.log('\n📡 Collecting scan targets...');
  const scanTokens = new Map<string, string>(); // addr → symbol
  
  try {
    const t = await getTrendingTokens(15);
    for (const x of t?.data?.tokens ?? []) {
      if (x.address) scanTokens.set(x.address, x.symbol ?? '?');
    }
  } catch {}
  
  try {
    const n = await getNewListings(10);
    for (const x of n?.data?.items ?? []) {
      if (x.address && !scanTokens.has(x.address)) scanTokens.set(x.address, x.symbol ?? '?');
    }
  } catch {}

  try {
    const m = await getMemeTokens(5);
    for (const x of m?.data?.items ?? m?.data ?? []) {
      if (x.address && !scanTokens.has(x.address)) scanTokens.set(x.address, x.symbol ?? '?');
    }
  } catch {}

  const targets = [...scanTokens.entries()].map(([address, symbol]) => ({ address, symbol }));
  console.log(`  ${targets.length} tokens to scan\n`);

  // Phase 3: Convergence detection
  const candidates = await findConvergenceCandidates(graph, targets);
  const events = await scoreConvergence(candidates);
  const signals = generateSignals(events);
  
  // Phase 4: Output
  printSignals(signals);
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n📊 ${getCallCount()} API calls | ⏱️ ${elapsed}s | ${new Date().toISOString()}`);
  
  // Save results
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(dir, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  
  const exportData = {
    nodes: [...graph.nodes.entries()].map(([addr, n]) => ({
      id: addr,
      short: `${addr.slice(0, 4)}…${addr.slice(-4)}`,
      pnl: n.totalPnL,
      winRate: n.winRate,
      tribeId: n.tribeId,
      tokenCount: n.tradedTokens.size,
    })),
    edges: graph.edges.map(e => ({
      source: e.walletA,
      target: e.walletB,
      weight: e.similarity,
      shared: e.sharedTokenCount,
    })),
    tribes: graph.tribes.map(t => ({
      id: t.id,
      size: t.wallets.length,
      pnl: t.totalPnL,
      similarity: t.avgSimilarity,
    })),
    signals: signals.map(s => ({
      token: s.event.tokenSymbol,
      address: s.event.tokenAddress,
      score: s.event.score,
      wallets: s.event.walletCount,
      crossTribe: s.event.crossTribe,
      risk: s.risk,
      mcap: s.event.mcap,
      volume: s.event.volume24h,
      priceChange: s.event.priceChange24h,
      buyers: s.event.buyers ?? 0,
      sellers: s.event.sellers ?? 0,
      profitableWallets: s.event.wallets.filter(w => w.pnl > 0).length,
    })),
    meta: {
      timestamp: new Date().toISOString(),
      apiCalls: getCallCount(),
      elapsedSec: Number(elapsed),
    },
  };
  
  fs.writeFileSync(path.join(dataDir, 'latest-scan.json'), JSON.stringify(exportData, null, 2));
  console.log(`💾 Results saved to data/latest-scan.json\n`);
}

scan().catch(console.error);
