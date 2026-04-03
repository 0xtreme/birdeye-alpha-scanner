/**
 * Standalone graph builder — builds and saves the co-trading graph
 * without running convergence detection. Useful for iteration.
 */

import { buildGraph } from './graph.js';
import { getCallCount } from './birdeye.js';
import fs from 'fs';

async function main() {
  const graph = await buildGraph();
  
  // Export for visualization
  const exportData = {
    nodes: [...graph.nodes.entries()].map(([addr, node]) => ({
      id: addr,
      shortId: `${addr.slice(0, 4)}...${addr.slice(-4)}`,
      pnl: node.totalPnL,
      winRate: node.winRate,
      tribeId: node.tribeId,
      tokenCount: node.tradedTokens.size,
      tokens: [...node.tradedTokens],
    })),
    edges: graph.edges.map(e => ({
      source: e.walletA,
      target: e.walletB,
      weight: e.similarity,
      sharedTokens: e.sharedTokenCount,
      tokens: e.sharedTokens,
    })),
    tribes: graph.tribes.map(t => ({
      id: t.id,
      size: t.wallets.length,
      wallets: t.wallets,
      totalPnL: t.totalPnL,
      avgSimilarity: t.avgSimilarity,
      activeTokens: t.activeTokens.length,
    })),
    meta: {
      seedTokens: graph.seedTokens,
      builtAt: graph.builtAt.toISOString(),
      apiCalls: getCallCount(),
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.length,
      tribeCount: graph.tribes.length,
    },
  };
  
  const dataDir = new URL('../data', import.meta.url).pathname;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    `${dataDir}/latest-graph.json`,
    JSON.stringify(exportData, null, 2)
  );
  
  console.log(`\n💾 Saved to data/latest-graph.json`);
  console.log(`   ${exportData.nodes.length} nodes, ${exportData.edges.length} edges, ${exportData.tribes.length} tribes`);
}

main().catch(console.error);
