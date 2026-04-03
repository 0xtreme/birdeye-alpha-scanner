# 🕸️ WhaleMesh — Smart Money Convergence Detector

**When multiple top-performing wallets converge on the same token, it's not noise — it's signal.**

Single-wallet trackers are everywhere. WhaleMesh does what nobody else does: maps the **relationships between** smart money wallets based on co-trading patterns, detects convergence events in real-time, and surfaces tokens that multiple unrelated profitable wallets are accumulating simultaneously.

**Built for:** [Birdeye Build in Public Competition](https://x.com/birdeye_data/status/2039333385047515148)

## How It Works

```
1. Discover top-performing wallets via Birdeye Smart Money + Top Traders APIs
2. Build a co-trading graph: which wallets keep buying the same tokens?
3. Cluster wallets into "tribes" based on trading pattern similarity
4. Detect convergence: when 3+ unrelated wallets buy the same token within hours
5. Score & alert: convergence strength × wallet PnL track record = signal quality
```

## What Makes This Different

| Existing Tools | WhaleMesh |
|---|---|
| Track individual wallets | Maps relationships BETWEEN wallets |
| "Whale X bought token Y" | "5 unrelated top wallets converged on Y in 6 hours" |
| Lists and tables | Interactive network graph visualization |
| Reactive (tells you what happened) | Predictive (convergence = early signal) |

## Architecture

```
Birdeye API
├── Smart Money Token List → seed tokens
├── Top Traders (per token) → discover wallets
├── Wallet PnL → verify profitability  
├── Wallet TX History → timing analysis
└── Token Overview + Security → context & safety

        ↓

WhaleMesh Engine
├── Graph Builder → wallet co-trading network
├── Tribe Detector → community detection / clustering
├── Convergence Scanner → real-time multi-wallet signals
└── Signal Scorer → convergence × PnL × security

        ↓

Output
├── Web Dashboard (d3.js force-directed graph)
├── Telegram Alerts
└── CLI Reports
```

## Tech Stack

- **Data:** Birdeye Data Services API + MCP Server
- **Engine:** Node.js / TypeScript
- **Graph:** Custom adjacency matrix + community detection
- **Visualization:** D3.js force-directed network graph
- **Delivery:** Web dashboard + Telegram bot
- **Chain:** Solana (primary)

## Competition

- **Prize:** $500 USDC/week + Birdeye Premium Plus
- **Requirement:** 50+ API calls, share on X with @birdeye_data #BirdeyeAPI
- **Duration:** 4 weeks (April 2 – ~April 30, 2026)

## Setup

```bash
npm install
cp .env.example .env  # Add your BIRDEYE_API_KEY
npm run test-api       # Verify API connection
npm run scan           # Run convergence scan
npm run dev            # Start dashboard + scanner
```

## Status

🚧 **Week 1** — Building graph engine + first convergence signals
