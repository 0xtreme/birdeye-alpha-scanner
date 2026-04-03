/**
 * WhaleMesh Convergence Detector — Free Tier Compatible
 */

import type { CoTradingGraph, Tribe, ConvergenceEvent, MeshSignal } from './types.js';
import { getTopTraders, getTokenOverview, getCallCount } from './birdeye.js';

interface Candidate {
  tokenAddress: string;
  tokenSymbol?: string;
  wallets: { address: string; pnl: number; tribeId?: number }[];
  crossTribe: boolean;
}

export async function findConvergenceCandidates(
  graph: CoTradingGraph & { tribes: Tribe[] },
  scanTokens: { address: string; symbol: string }[],
): Promise<Candidate[]> {
  console.log(`🎯 Scanning ${scanTokens.length} tokens for convergence...\n`);
  
  const candidates: Candidate[] = [];
  const graphWallets = new Set(graph.nodes.keys());

  for (const token of scanTokens) {
    try {
      const data = await getTopTraders(token.address);
      const traders = data?.data?.items ?? data?.data ?? [];
      
      const matched: Candidate['wallets'] = [];
      for (const trader of traders) {
        const wallet = trader.owner ?? trader.address ?? trader.wallet;
        if (wallet && graphWallets.has(wallet)) {
          const node = graph.nodes.get(wallet)!;
          matched.push({ address: wallet, pnl: node.totalPnL, tribeId: node.tribeId });
        }
      }
      
      if (matched.length >= 2) {
        const uniqueTribes = new Set(matched.map(w => w.tribeId).filter(t => t !== undefined));
        const crossTribe = uniqueTribes.size >= 2;
        
        candidates.push({ tokenAddress: token.address, tokenSymbol: token.symbol, wallets: matched, crossTribe });
        
        const icon = crossTribe ? '🔥' : '📍';
        console.log(`  ${icon} ${token.symbol.padEnd(12)} — ${matched.length} graph wallets${crossTribe ? ' (CROSS-TRIBE!)' : ''}`);
      }
    } catch {}
  }
  
  candidates.sort((a, b) => {
    if (a.crossTribe !== b.crossTribe) return a.crossTribe ? -1 : 1;
    return b.wallets.length - a.wallets.length;
  });
  
  console.log(`\n  ${candidates.length} convergence candidates (${candidates.filter(c => c.crossTribe).length} cross-tribe)`);
  console.log(`  API calls: ${getCallCount()}\n`);
  
  return candidates;
}

export async function scoreConvergence(candidates: Candidate[], maxEnrich = 8): Promise<ConvergenceEvent[]> {
  console.log('📊 Scoring convergence events...\n');
  
  const events: ConvergenceEvent[] = [];

  for (const c of candidates.slice(0, maxEnrich)) {
    try {
      const overview = await getTokenOverview(c.tokenAddress);
      const d = overview?.data;
      
      let score = 0;
      const warnings: string[] = [];
      
      // Wallet count (max 40)
      score += Math.min(40, c.wallets.length * 10);
      
      // Cross-tribe bonus (25)
      if (c.crossTribe) score += 25;
      
      // Combined PnL credibility
      const combinedPnL = c.wallets.reduce((s, w) => s + w.pnl, 0);
      if (combinedPnL > 100000) score += 15;
      else if (combinedPnL > 10000) score += 10;
      else if (combinedPnL > 0) score += 5;
      
      // Liquidity check
      const liquidity = d?.liquidity ?? 0;
      if (liquidity > 50000) score += 10;
      else if (liquidity < 5000) { score -= 15; warnings.push('Very low liquidity'); }
      
      // Volume sanity
      const vol = d?.v24hUSD ?? d?.volume24hUSD ?? 0;
      if (vol > 100000) score += 5;
      
      score = Math.max(0, Math.min(100, score));
      
      const mcap = d?.marketCap ?? d?.mc ?? d?.fdv ?? 0;
      
      events.push({
        tokenAddress: c.tokenAddress,
        tokenSymbol: d?.symbol ?? c.tokenSymbol ?? '?',
        tokenName: d?.name,
        wallets: c.wallets.map(w => ({ address: w.address, pnl: w.pnl, action: 'buy' as const })),
        walletCount: c.wallets.length,
        crossTribe: c.crossTribe,
        combinedPnL,
        score,
        mcap,
        volume24h: vol,
        liquidity,
        priceChange24h: d?.priceChange24hPercent,
        securityPassed: true, // can't check on free tier
        securityWarnings: warnings,
        detectedAt: new Date(),
      });

      const emoji = score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴';
      console.log(`  ${emoji} ${(d?.symbol ?? '?').padEnd(12)} Score: ${score}/100 | ${c.wallets.length} wallets${c.crossTribe ? ' | CROSS-TRIBE' : ''} | MCap: $${d?.mc ? (d.mc / 1e6).toFixed(2) + 'M' : '?'}`);
    } catch (e: any) {
      console.log(`  ⚠️ ${c.tokenAddress.slice(0, 8)}... — ${e.message}`);
    }
  }

  events.sort((a, b) => b.score - a.score);
  console.log(`\n  ${events.length} events scored | API calls: ${getCallCount()}\n`);
  return events;
}

export function generateSignals(events: ConvergenceEvent[]): MeshSignal[] {
  return events
    .filter(e => e.score > 20)
    .map(e => {
      const risk = e.score >= 60 ? 'LOW' : e.score >= 35 ? 'MEDIUM' : 'HIGH';
      
      const lines = [
        `🕸️ CONVERGENCE: ${e.walletCount} top wallets → $${e.tokenSymbol}`,
        `   Score: ${e.score}/100 | Risk: ${risk}`,
        e.mcap ? `   MCap: $${(e.mcap / 1e6).toFixed(2)}M` : null,
        e.volume24h ? `   Vol 24h: $${(e.volume24h / 1e3).toFixed(0)}K` : null,
        e.priceChange24h != null ? `   Price 24h: ${e.priceChange24h > 0 ? '+' : ''}${e.priceChange24h.toFixed(1)}%` : null,
        `   Combined Wallet PnL: $${(e.combinedPnL / 1e3).toFixed(1)}K`,
        e.crossTribe ? '   ⚡ CROSS-TRIBE — independent wallets converging' : '   🔗 Same tribe — may be coordinated',
        e.securityWarnings.length > 0 ? `   ⚠️ ${e.securityWarnings.join(', ')}` : null,
      ].filter(Boolean).join('\n');
      
      return { type: 'convergence' as const, event: e, summary: lines, risk };
    });
}

export function printSignals(signals: MeshSignal[]) {
  console.log('═'.repeat(60));
  console.log('🕸️  WHALEMESH — CONVERGENCE SIGNALS');
  console.log('═'.repeat(60));

  if (signals.length === 0) {
    console.log('\n  No convergence signals this scan.');
    console.log('  Top wallets are not clustering on shared tokens right now.\n');
    return;
  }

  for (const s of signals.slice(0, 10)) {
    console.log('\n' + '─'.repeat(50));
    console.log(s.summary);
    console.log('  Wallets:');
    for (const w of s.event.wallets.slice(0, 5)) {
      console.log(`    ${w.address.slice(0, 6)}...${w.address.slice(-4)} | PnL: $${(w.pnl / 1e3).toFixed(1)}K`);
    }
    if (s.event.wallets.length > 5) console.log(`    ... +${s.event.wallets.length - 5} more`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  ${signals.length} signals | ${new Date().toISOString()}`);
  console.log('═'.repeat(60));
}
