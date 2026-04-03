/**
 * WhaleMesh — Main Entry
 * Runs periodic scans on an interval.
 */

import { buildGraph, discoverSeedTokens } from './graph.js';
import {
  findConvergenceCandidates,
  scoreConvergence,
  generateSignals,
  printSignals,
} from './convergence.js';
import {
  getTrendingTokens,
  getNewListings,
  getSmartMoneyTokens,
} from './birdeye.js';

const SCAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function runScan() {
  console.log(`\n⏰ [${new Date().toISOString()}] Running WhaleMesh scan...\n`);
  
  try {
    // Build graph
    const graph = await buildGraph();
    
    // Collect scan targets
    const scanTokens = new Set<string>();
    try {
      const t = await getTrendingTokens(20);
      (t?.data?.tokens ?? []).forEach((x: any) => x.address && scanTokens.add(x.address));
    } catch {}
    try {
      const n = await getNewListings(15);
      (n?.data?.items ?? []).forEach((x: any) => x.address && scanTokens.add(x.address));
    } catch {}
    try {
      const s = await getSmartMoneyTokens(15);
      (s?.data?.items ?? []).forEach((x: any) => x.address && scanTokens.add(x.address));
    } catch {}

    // Detect convergence
    const candidates = await findConvergenceCandidates(graph, [...scanTokens]);
    const events = await scoreConvergence(candidates);
    const signals = generateSignals(events);
    printSignals(signals);
    
    return signals;
  } catch (e: any) {
    console.error(`Scan error: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('🕸️  WhaleMesh v0.1.0 — Smart Money Convergence Detector');
  console.log(`   Scan interval: ${SCAN_INTERVAL_MS / 60000} minutes`);
  console.log('   Press Ctrl+C to stop\n');

  // Initial scan
  await runScan();

  // Periodic scans
  setInterval(runScan, SCAN_INTERVAL_MS);
}

main().catch(console.error);
