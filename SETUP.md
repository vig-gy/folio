# Folio — Setup Guide

## Prerequisites

- Google Cloud project with Sheets API enabled
- Workload Identity Federation pool configured for Vercel
- GitHub repo: `vig-gy/folio`
- Vercel account connected to GitHub

## Vercel Environment Variables

Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Value | Description |
|---|---|---|
| `GOOGLE_SHEET_ID` | `197rB1K5hoes3G6DnjVULKeIqeDAZ71tSsJuPGu_vmks` | Your Google Sheet ID |
| `GOOGLE_CLOUD_PROJECT_NUMBER` | `645416456210` | GCP project number |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `folio-sheets-reader@financial-portfolio-analyser.iam.gserviceaccount.com` | Service account |
| `FMP_API_KEY` | Your FMP key | Financial Modeling Prep |
| `ANTHROPIC_API_KEY` | Your Anthropic key | Claude AI |
| `APP_PASSWORD` | Your chosen password | Lock screen |

## WIF Configuration

The Workload Identity Federation pool is configured at:
- Pool: `vercel-pool`
- Provider: `vercel-provider`  
- Binding: `repo:vig-gy/folio:environment:production`

## Deploy

1. Push code to `main` branch on GitHub
2. Vercel auto-deploys on push
3. Add environment variables in Vercel dashboard
4. Visit your Vercel URL and install as PWA on your phone

## Install as PWA on iPhone

1. Open the Vercel URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your values
# For local dev, add GOOGLE_SERVICE_ACCOUNT_KEY as JSON string
npm run dev
```
