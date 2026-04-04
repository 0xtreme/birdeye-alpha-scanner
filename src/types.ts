/**
 * WhaleMesh Core Types
 */

/** A wallet node in the co-trading graph */
export interface WalletNode {
  address: string;
  /** Total realized PnL in USD */
  totalPnL: number;
  /** Win rate (0-1) */
  winRate: number;
  /** Net worth in USD */
  netWorth: number;
  /** Total unique tokens ever traded */
  uniqueTokenCount: number;
  /** Tokens this wallet has traded (addresses) */
  tradedTokens: Set<string>;
  /** Per-token buy/sell bias: token address → { buyVol, sellVol } */
  tokenBias: Map<string, { buyVol: number; sellVol: number }>;
  /** Tribe/cluster ID (assigned by community detection) */
  tribeId?: number;
  /** Label (if known) */
  label?: string;
  /** Is this wallet filtered as a bot/exchange? */
  isBot?: boolean;
}

/** An edge in the co-trading graph — two wallets that trade the same tokens */
export interface CoTradingEdge {
  walletA: string;
  walletB: string;
  /** Number of tokens both wallets traded */
  sharedTokenCount: number;
  /** The actual shared token addresses */
  sharedTokens: string[];
  /** Jaccard similarity: |A∩B| / |A∪B| */
  similarity: number;
  /** How close in time they traded the shared tokens (avg hours apart) */
  avgTimingGapHours?: number;
}

/** The full co-trading graph */
export interface CoTradingGraph {
  nodes: Map<string, WalletNode>;
  edges: CoTradingEdge[];
  /** When this graph was built */
  builtAt: Date;
  /** Seed tokens used to discover wallets */
  seedTokens: string[];
}

/** A tribe — cluster of wallets that co-trade frequently */
export interface Tribe {
  id: number;
  wallets: string[];
  /** Combined PnL of tribe members */
  totalPnL: number;
  /** Average similarity within the tribe */
  avgSimilarity: number;
  /** Tokens this tribe is currently accumulating */
  activeTokens: string[];
}

/** A convergence event — multiple wallets buying the same token in a time window */
export interface ConvergenceEvent {
  /** Token being converged on */
  tokenAddress: string;
  tokenSymbol: string;
  tokenName?: string;
  /** Wallets involved */
  wallets: {
    address: string;
    pnl: number;
    action: 'buy' | 'sell';
    timestamp?: number;
  }[];
  /** How many wallets converged */
  walletCount: number;
  /** Are the wallets from different tribes? (stronger signal) */
  crossTribe: boolean;
  /** Combined PnL track record of converging wallets */
  combinedPnL: number;
  /** Signal score 0-100 */
  score: number;
  /** Token market data */
  mcap?: number;
  volume24h?: number;
  liquidity?: number;
  priceChange24h?: number;
  /** Buy/sell breakdown */
  buyers?: number;
  sellers?: number;
  /** Security flags */
  securityPassed: boolean;
  securityWarnings: string[];
  /** When detected */
  detectedAt: Date;
}

/** Signal output for alerts/dashboard */
export interface MeshSignal {
  type: 'convergence' | 'tribe_move' | 'divergence';
  event: ConvergenceEvent;
  /** Human-readable summary */
  summary: string;
  /** Risk level */
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}
