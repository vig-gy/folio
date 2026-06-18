# Folio — Personal Financial Portfolio Analyzer

A mobile-first PWA for monitoring, analysing, and researching your investment portfolio.
Built with Next.js 14, TypeScript, Tailwind CSS, and Claude AI.

## Features

- **Snapshot** — Net worth overview with monthly change tracking
- **Allocation** — Asset class breakdown vs targets, platform breakdown  
- **Performance** — TWR, MWR, benchmark comparison (VWRA, VOO, QQQ)
- **Holdings** — Full position list with filtering and sorting
- **Liabilities** — Loan tracking with repayment schedules
- **CPF** — CPF account balances and FRS gap analysis
- **History** — Full net worth history chart and monthly snapshots
- **AI Analysis** — Claude-powered portfolio health scorecard and chat
- **Stock Research** — Ticker search with FMP data and Claude analysis

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [Google Sheets API](https://developers.google.com/sheets/api) via Workload Identity Federation
- [Financial Modeling Prep](https://financialmodelingprep.com/) for stock data
- [Anthropic Claude](https://www.anthropic.com/) for AI analysis
- Deployed on [Vercel](https://vercel.com/)

## Security

- Workload Identity Federation (no static service account keys)
- Password-protected lock screen
- All secrets stored as Vercel environment variables only
- `.env.local` never committed to git

## Setup

See [SETUP.md](SETUP.md) for deployment instructions.

## Data Source

Portfolio data is read from a private Google Sheet. The sheet structure follows
a specific format for net worth snapshots, positions, CPF, liabilities, and cash.

---

Built by [@vig-gy](https://github.com/vig-gy)
