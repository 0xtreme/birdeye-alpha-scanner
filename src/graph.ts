/**
 * WhaleMesh Graph Engine — Free Tier Compatible
 * 
 * 1. Seed tokens from trending + new listings + memes + top movers
 * 2. Top traders per seed → discover wallets
 * 3. Wallet PnL profiling
 * 4. Co-trading edges (Jaccard similarity)
 * 5. Community detection (label propagation)
 */

import type { WalletNode, CoTradingEdge, CoTradingGraph, Tribe } from './types.js';
import {
  getTrendingTokens,
  getNewListings,
  getMemeTokens,
  getTopMovers,
  getTopTraders,
  getWalletPnL,
  getCallCount,
} from './birdeye.js';

// ═══════════════════════════════════════════
// STEP 1: Discover seed tokens
// ═══════════════════════════════════════════

export async function discoverSeedTokens(limit = 12): Promise<{ address: string; symbol: string }[]> {
  console.log('🌱 Discovering seed tokens...');
  
  const tokenMap = new Map<string, string>(); // address → symbol

  try {
    const data = await getTrendingTokens(10);
    for (const t of data?.data?.tokens ?? []) {
      if (t.address) tokenMap.set(t.address, t.symbol ?? '?');
    }
    console.log(`  Trending: ${tokenMap.size} tokens`);
  } catch (e: any) {
    console.log(`  Trending: failed — ${e.message}`);
  }

  try {
    const data = await getNewListings(8);
    for (const t of data?.data?.items ?? []) {
      if (t.address && !tokenMap.has(t.address)) tokenMap.set(t.address, t.symbol ?? '?');
    }
    console.log(`  New listings: added ${Math.max(0, tokenMap.size - 10)}`);
  } catch (e: any) {
    console.log(`  New listings: failed — ${e.message}`);
  }

  try {
    const data = await getMemeTokens(5);
    for (const t of data?.data?.items ?? data?.data ?? []) {
      if (t.address && !tokenMap.has(t.address)) tokenMap.set(t.address, t.symbol ?? '?');
    }
    console.log(`  Memes: total now ${tokenMap.size}`);
  } catch (e: any) {
    console.log(`  Memes: failed — ${e.message}`);
  }

  try {
    const data = await getTopMovers(5);
    for (const t of data?.data?.items ?? data?.data ?? []) {
      if (t.address && !tokenMap.has(t.address)) tokenMap.set(t.address, t.symbol ?? '?');
    }
    console.log(`  Top movers: total now ${tokenMap.size}`);
  } catch (e: any) {
    console.log(`  Top movers: failed — ${e.message}`);
  }

  const seeds = [...tokenMap.entries()].slice(0, limit).map(([address, symbol]) => ({ address, symbol }));
  console.log(`  ✅ ${seeds.length} seed tokens selected`);
  seeds.forEach(s => console.log(`     • ${s.symbol} (${s.address.slice(0, 8)}...)`));
  console.log();
  return seeds;
}

// ═══════════════════════════════════════════
// STEP 2: Discover wallets from seed tokens
// ═══════════════════════════════════════════

export async function discoverWallets(
  seedTokens: { address: string; symbol: string }[]
): Promise<{ walletTokens: Map<string, Set<string>>; tokenSymbols: Map<string, string> }> {
  console.log('🔍 Discovering top traders...');
  
  const walletTokens = new Map<string, Set<string>>();
  const tokenSymbols = new Map<string, string>();

  for (const seed of seedTokens) {
    tokenSymbols.set(seed.address, seed.symbol);
    try {
      const data = await getTopTraders(seed.address);
      const traders = data?.data?.items ?? data?.data ?? [];
      
      let count = 0;
      for (const trader of traders.slice(0, 15)) {
        const wallet = trader.owner ?? trader.address ?? trader.wallet;
        if (!wallet) continue;
        
        if (!walletTokens.has(wallet)) walletTokens.set(wallet, new Set());
        walletTokens.get(wallet)!.add(seed.address);
        count++;
      }
      
      console.log(`  ${seed.symbol.padEnd(12)} → ${count} traders`);
    } catch (e: any) {
      console.log(`  ${seed.symbol.padEnd(12)} → failed`);
    }
  }

  console.log(`\n  Total unique wallets discovered: ${walletTokens.size}`);
  console.log(`  API calls so far: ${getCallCount()}\n`);
  
  return { walletTokens, tokenSymbols };
}

// ═══════════════════════════════════════════
// STEP 3: Profile wallets with PnL
// ═══════════════════════════════════════════

export async function buildWalletProfiles(
  walletTokens: Map<string, Set<string>>,
  maxWallets = 30
): Promise<Map<string, WalletNode>> {
  // Prioritize wallets in 2+ token lists, then fill with single-token wallets
  const sorted = [...walletTokens.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, maxWallets);
  
  const multiCount = sorted.filter(([_, t]) => t.size >= 2).length;
  console.log(`📊 Profiling ${sorted.length} wallets (${multiCount} in 2+ token lists)...`);
  const multiToken = sorted;
  
  const nodes = new Map<string, WalletNode>();
  let withPnL = 0;

  for (const [wallet, tokens] of multiToken) {
    try {
      const rawPnl = await getWalletPnL(wallet);
      const pnlRoot = rawPnl?.data;
      
      const summary = pnlRoot?.summary ?? pnlRoot;
      const pnlNums = summary?.pnl ?? {};
      const counts = summary?.counts ?? {};
      const cashflow = summary?.cashflow_usd ?? {};
      
      nodes.set(wallet, {
        address: wallet,
        totalPnL: pnlNums?.realized_profit_usd ?? pnlNums?.total_usd ?? 0,
        winRate: counts?.win_rate ?? 0,
        netWorth: cashflow?.current_value ?? 0,
        tradedTokens: tokens,
      });
      withPnL++;
    } catch {
      nodes.set(wallet, {
        address: wallet,
        totalPnL: 0,
        winRate: 0,
        netWorth: 0,
        tradedTokens: tokens,
      });
    }
    
    if (nodes.size % 10 === 0) {
      console.log(`  ... ${nodes.size}/${multiToken.length} (${getCallCount()} API calls)`);
    }
  }

  console.log(`  ✅ ${nodes.size} wallets profiled (${withPnL} with PnL data)`);
  console.log(`  API calls so far: ${getCallCount()}\n`);
  
  return nodes;
}

// ═══════════════════════════════════════════
// STEP 4: Co-trading edges
// ═══════════════════════════════════════════

export function buildCoTradingEdges(nodes: Map<string, WalletNode>): CoTradingEdge[] {
  console.log('🔗 Building co-trading edges...');
  
  const edges: CoTradingEdge[] = [];
  const wallets = [...nodes.keys()];
  
  for (let i = 0; i < wallets.length; i++) {
    for (let j = i + 1; j < wallets.length; j++) {
      const a = nodes.get(wallets[i])!;
      const b = nodes.get(wallets[j])!;
      
      const shared = [...a.tradedTokens].filter(t => b.tradedTokens.has(t));
      if (shared.length === 0) continue;
      
      const union = new Set([...a.tradedTokens, ...b.tradedTokens]);
      const similarity = shared.length / union.size;
      
      if (shared.length >= 1) {
        edges.push({
          walletA: wallets[i],
          walletB: wallets[j],
          sharedTokenCount: shared.length,
          sharedTokens: shared,
          similarity,
        });
      }
    }
  }

  edges.sort((a, b) => b.similarity - a.similarity);
  
  console.log(`  ✅ ${edges.length} co-trading edges`);
  if (edges.length > 0) {
    console.log(`  Strongest link: ${edges[0].similarity.toFixed(3)} similarity (${edges[0].sharedTokenCount} shared tokens)`);
  }
  console.log();
  
  return edges;
}

// ═══════════════════════════════════════════
// STEP 5: Community detection
// ═══════════════════════════════════════════

export function detectTribes(
  nodes: Map<string, WalletNode>,
  edges: CoTradingEdge[],
  iterations = 15
): Tribe[] {
  console.log('🏘️  Detecting tribes (label propagation)...');
  
  const neighbors = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    if (!neighbors.has(edge.walletA)) neighbors.set(edge.walletA, new Map());
    if (!neighbors.has(edge.walletB)) neighbors.set(edge.walletB, new Map());
    neighbors.get(edge.walletA)!.set(edge.walletB, edge.similarity);
    neighbors.get(edge.walletB)!.set(edge.walletA, edge.similarity);
  }
  
  const labels = new Map<string, number>();
  let id = 0;
  for (const wallet of nodes.keys()) labels.set(wallet, id++);
  
  for (let iter = 0; iter < iterations; iter++) {
    let changed = 0;
    const list = [...nodes.keys()];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    
    for (const wallet of list) {
      const neighMap = neighbors.get(wallet);
      if (!neighMap || neighMap.size === 0) continue;
      
      const votes = new Map<number, number>();
      for (const [neighbor, weight] of neighMap) {
        const label = labels.get(neighbor)!;
        votes.set(label, (votes.get(label) ?? 0) + weight);
      }
      
      let best = labels.get(wallet)!;
      let bestW = 0;
      for (const [label, weight] of votes) {
        if (weight > bestW) { bestW = weight; best = label; }
      }
      
      if (best !== labels.get(wallet)) { labels.set(wallet, best); changed++; }
    }
    
    if (changed === 0) {
      console.log(`  Converged at iteration ${iter + 1}`);
      break;
    }
  }
  
  for (const [wallet, label] of labels) {
    const node = nodes.get(wallet);
    if (node) node.tribeId = label;
  }
  
  const tribeMap = new Map<number, string[]>();
  for (const [wallet, label] of labels) {
    if (!tribeMap.has(label)) tribeMap.set(label, []);
    tribeMap.get(label)!.push(wallet);
  }
  
  const tribes: Tribe[] = [];
  for (const [tribeId, wallets] of tribeMap) {
    if (wallets.length < 2) continue;
    
    const totalPnL = wallets.reduce((s, w) => s + (nodes.get(w)?.totalPnL ?? 0), 0);
    const activeTokens = new Set<string>();
    for (const w of wallets) {
      for (const t of nodes.get(w)?.tradedTokens ?? []) activeTokens.add(t);
    }
    
    const tribeEdges = edges.filter(e => wallets.includes(e.walletA) && wallets.includes(e.walletB));
    const avgSim = tribeEdges.length > 0 ? tribeEdges.reduce((s, e) => s + e.similarity, 0) / tribeEdges.length : 0;
    
    tribes.push({ id: tribeId, wallets, totalPnL, avgSimilarity: avgSim, activeTokens: [...activeTokens] });
  }
  
  tribes.sort((a, b) => b.wallets.length - a.wallets.length);
  
  console.log(`  ✅ ${tribes.length} tribes detected`);
  tribes.slice(0, 5).forEach((t, i) => {
    console.log(`     Tribe ${i + 1}: ${t.wallets.length} wallets | $${(t.totalPnL / 1000).toFixed(1)}K PnL | ${t.activeTokens.length} tokens`);
  });
  console.log();
  
  return tribes;
}

// ═══════════════════════════════════════════
// FULL BUILD
// ═══════════════════════════════════════════

export async function buildGraph(): Promise<CoTradingGraph & { tribes: Tribe[]; tokenSymbols: Map<string, string> }> {
  console.log('🕸️  WhaleMesh — Building Co-Trading Graph');
  console.log('═'.repeat(50) + '\n');
  
  const seeds = await discoverSeedTokens(15);
  const { walletTokens, tokenSymbols } = await discoverWallets(seeds);
  const nodes = await buildWalletProfiles(walletTokens, 40);
  const edges = buildCoTradingEdges(nodes);
  const tribes = detectTribes(nodes, edges);
  
  console.log('═'.repeat(50));
  console.log(`✅ Graph complete!`);
  console.log(`   ${nodes.size} wallets | ${edges.length} edges | ${tribes.length} tribes`);
  console.log(`   ${getCallCount()} API calls used`);
  console.log('═'.repeat(50));
  
  return {
    nodes, edges, tribes, tokenSymbols,
    builtAt: new Date(),
    seedTokens: seeds.map(s => s.address),
  };
}
