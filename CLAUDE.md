# Folio — Claude Code Context

## What this project is
Folio is a personal financial portfolio analyzer built for Vignesh (Singapore-based, 28, AI strategy in financial services). It is a mobile-first PWA that reads live data from a private Google Sheet and provides portfolio monitoring, AI analysis, and stock research.

## Tech stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS (dark mode only, custom obsidian palette)
- Recharts for all charts
- Google Sheets API via Workload Identity Federation (no static keys)
- Anthropic Claude API (claude-sonnet-4-6) for AI analysis and stock research
- Financial Modeling Prep (FMP) API for stock data
- Deployed on Vercel

## Project structure
```
folio/
├── app/
│   ├── page.tsx              # Entire frontend — all 9 screens in one file
│   ├── layout.tsx            # Root layout, PWA metadata
│   ├── globals.css           # Global styles, Tailwind base
│   └── api/
│       ├── portfolio/route.ts # Fetches + parses Google Sheet data
│       ├── auth/route.ts      # Password verification
│       ├── analyze/route.ts   # Claude AI portfolio analysis + chat
│       └── research/route.ts  # Stock research via FMP + Claude
├── lib/
│   ├── sheets.ts             # Google Sheets auth (WIF) + data fetching
│   └── parser.ts             # Parses raw sheet values into typed objects
├── public/
│   └── manifest.json         # PWA manifest
├── CLAUDE.md                 # This file
├── SETUP.md                  # Deployment guide
└── .env.example              # Env var template (safe to commit)
```

## Environment variables (never commit, set in Vercel)
```
GOOGLE_SHEET_ID=197rB1K5hoes3G6DnjVULKeIqeDAZ71tSsJuPGu_vmks
GOOGLE_CLOUD_PROJECT_NUMBER=645416456210
GOOGLE_SERVICE_ACCOUNT_EMAIL=folio-sheets-reader@financial-portfolio-analyser.iam.gserviceaccount.com
FMP_API_KEY=<from FMP dashboard>
ANTHROPIC_API_KEY=<from console.anthropic.com>
APP_PASSWORD=<chosen password>
```

For local dev only, also add to `.env.local`:
```
GOOGLE_SERVICE_ACCOUNT_KEY=<paste full service account JSON as single line>
```
This bypasses WIF for local development. Never commit this file.

## Google Cloud setup
- Project: Financial Portfolio Analyser
- Project number: 645416456210
- Service account: folio-sheets-reader@financial-portfolio-analyser.iam.gserviceaccount.com
- WIF pool: vercel-pool
- WIF provider: vercel-provider
- WIF binding: repo:vig-gy/folio:environment:production
- Sheet shared with service account as Viewer

## Authentication flow
- Production (Vercel): Workload Identity Federation — Vercel presents OIDC token, Google exchanges for short-lived access token via service account impersonation. No static secrets anywhere.
- Local dev: Service account JSON key stored in GOOGLE_SERVICE_ACCOUNT_KEY env var only. Never committed.
- App lock screen: simple password check via /api/auth. Password stored only in Vercel env vars.

## The 9 screens
1. **Snapshot** — Net worth hero metric, monthly change, 12-month chart, asset split
2. **Allocation** — Donut chart (excl. cash), actual vs target bars, platform breakdown
3. **Performance** — TWR +17.2% ann., MWR +12.4% ann., benchmark comparison (VWRA/VOO/QQQ)
4. **Holdings** — Position list with filter by category, sortable by value
5. **Liabilities** — GXS loan ($7,452, 4.09%, bullet Oct 2026) + Father's capital ($30k+ in VWRA)
6. **CPF** — OA/SA/MA balances, FRS gap analysis to 2053
7. **History** — Full stacked area chart Jun 2023–present, monthly snapshot table
8. **AI Analysis** — Claude health scorecard + recommendations + chat interface
9. **Stock Research** — FMP data + Claude analysis, watchlist

## Design system
Dark mode only. Key colours:
- Background: #0a0a0f (primary), #0f0f18, #16161f (cards), #1e1e2a (hover)
- Accent: #6366f1 (iris/indigo) — primary brand colour
- Success: #10b981 (emerald)
- Warning: #f59e0b (amber)
- Danger: #f43f5e (rose)
- Text: #f1f5f9 (primary), #94a3b8 (secondary), #475569 (muted)
- Font: Inter (sans), JetBrains Mono (numbers/mono)
- Border: rgba(255,255,255,0.06) standard, 0.12 strong
- Border radius: rounded-2xl on cards, rounded-xl on inputs/buttons

## Portfolio context (Vignesh's portfolio)
- Investment horizon: 32 years (target withdrawal at age 60)
- Target allocation: 90% equities (78% index / 12% individual stocks), 5% bonds (SSBs), 5% crypto+gold
- Cash target: SGD 10-12k steady state
- Key holdings: VWRA (global index, IBKR), VOO (S&P500, all platforms), NVDA, XPEV, MU, CEG, GOOGL, ZS, NOW, IAU (gold), IBIT, ETHA, SSBs
- Platforms: IBKR (primary), moomoo (MMF access), Tiger, Webull
- Father's capital: ~SGD 30k in VWRA, interest-free, 5-7 year horizon
- GXS loan: SGD 7,452 at 4.09%, bullet ~SGD 6,480 due Oct 2026
- Physical AI thesis: XPEV, NVDA as core physical AI plays; considering UBTECH (9880.HK)

## Google Sheet structure
The sheet has these tabs (all read via batchGet):
- **Net Worth** — Summary metrics + monthly snapshots (col F onwards)
- **Equities** — Transaction history + platform cashflow columns
- **Portfolio Allocation** — Current positions with prices, units, FX rates
- **Dashboard** — Ticker-level and asset class aggregations
- **Crypto & Gold** — IBIT, ETHA, IAU positions and P/L
- **Bonds** — SSB holdings
- **Cash** — Bank account balances
- **CPF** — OA/SA/MA balances and transfer history
- **Liabilities** — Loan details with tranches

## Parser logic (lib/parser.ts)
- `parseSGD()` — strips $, commas, handles negatives
- `parsePct()` — strips % sign
- `categorize()` — maps tickers to index/stock/gold/crypto/cash
- INDEX_TICKERS: VWRA, VOO, VTI, SPY, QQQ
- GOLD_TICKERS: IAU, GLD
- CRYPTO_TICKERS: IBIT, ETHA, BTC, ETH
- Cash detected by "Cash" keyword in ticker name

## Coding conventions
- All components in app/page.tsx for now (Phase 1). Split into separate files as complexity grows.
- API routes in app/api/*/route.ts, all marked `export const runtime = "nodejs"`
- No localStorage or sessionStorage (not supported in this environment)
- Recharts tooltips use custom TTip component for consistent dark styling
- Formatter functions: fmtSGD(), fmtPct(), fmt() at top of page.tsx
- TypeScript strict — avoid `any`, use proper types from lib/parser.ts

## Known issues / TODO for next sprint
- [ ] Performance screen TWR/MWR figures are currently hardcoded from our analysis session — need to compute dynamically from snapshot data
- [ ] Need placeholder PWA icons (icon-192.png, icon-512.png) in /public
- [ ] Local dev needs GOOGLE_SERVICE_ACCOUNT_KEY in .env.local to bypass WIF
- [ ] Consider splitting page.tsx into separate screen components as file grows
- [ ] Add pull-to-refresh gesture on mobile
- [ ] UBTECH (9880.HK) on watchlist — FMP may not cover HKEX tickers, may need fallback

## Deployment
- Repo: github.com/vig-gy/folio (public)
- Hosting: Vercel (auto-deploys on push to main)
- PWA: installable via Safari → Share → Add to Home Screen
- Every push to main triggers a new Vercel deployment automatically

## Phase 2 plans (not built yet)
- Multi-user support with OAuth per user
- Opinionated sheet template for others to use
- AI ingestion of arbitrary sheet structures via Claude
- More granular TWR/MWR computed from actual cashflow data
