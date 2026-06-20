import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";

export const runtime = "nodejs";

// v3 default export is the class constructor, not an instance
const yahooFinance = new (YahooFinanceClass as any)({ suppressNotices: ["ripHistorical"] });

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "No ticker provided" }, { status: 400 });

  try {
    const [quote, summary, searchResults] = await Promise.allSettled([
      yahooFinance.quote(ticker),
      yahooFinance.quoteSummary(ticker, {
        modules: ["price", "assetProfile", "defaultKeyStatistics", "summaryDetail"],
      }),
      yahooFinance.search(ticker, { newsCount: 5, quotesCount: 0 }),
    ]);

    // yahoo-finance2's quoteSummary overloads don't infer cleanly; cast to any
    const q: any  = quote.status         === "fulfilled" ? quote.value         : null;
    const s: any  = summary.status       === "fulfilled" ? summary.value       : null;
    const sr: any = searchResults.status === "fulfilled" ? searchResults.value : null;

    const profile = s?.assetProfile ?? {};
    const price   = s?.price ?? {};
    const stats   = s?.defaultKeyStatistics ?? {};
    const detail  = s?.summaryDetail ?? {};

    const companyData = {
      profile: {
        companyName: q?.longName ?? q?.shortName ?? ticker,
        sector: (profile as any).sector ?? (q as any)?.sector ?? "Unknown",
        mktCap: (price as any).marketCap?.raw ?? (q as any)?.marketCap ?? 0,
        price: (q as any)?.regularMarketPrice ?? (price as any).regularMarketPrice?.raw ?? 0,
        currency: (q as any)?.currency ?? "USD",
        exchange: (q as any)?.fullExchangeName ?? "",
      },
      quote: {
        changesPercentage: ((q as any)?.regularMarketChangePercent ?? 0) * 100,
        change: (q as any)?.regularMarketChange ?? 0,
        dayHigh: (q as any)?.regularMarketDayHigh ?? 0,
        dayLow: (q as any)?.regularMarketDayLow ?? 0,
        fiftyTwoWeekHigh: (q as any)?.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: (q as any)?.fiftyTwoWeekLow ?? 0,
        volume: (q as any)?.regularMarketVolume ?? 0,
      },
      ratios: {
        peRatioTTM: (stats as any).trailingEps?.raw
          ? ((q as any)?.regularMarketPrice ?? 0) / (stats as any).trailingEps.raw
          : ((detail as any).trailingPE?.raw ?? (q as any)?.trailingPE ?? null),
        priceToSalesRatioTTM: (stats as any).priceToSalesTrailing12Months?.raw ?? null,
        forwardPE: (stats as any).forwardPE?.raw ?? (q as any)?.forwardPE ?? null,
        priceToBook: (stats as any).priceToBook?.raw ?? (q as any)?.priceToBook ?? null,
      },
      description: (profile as any).longBusinessSummary?.slice(0, 500) ?? "",
      recentNews: (sr?.news ?? []).slice(0, 5).map((n: any) => ({
        title: n.title,
        publishedDate: new Date(n.providerPublishTime * 1000).toISOString(),
        url: n.link,
      })),
    };

    const prompt = `You are a financial analyst. Analyse this stock for a 28-year-old Singapore-based investor with a 5-10 year investment horizon focused on physical AI, technology, and global index investing.

Stock data:
${JSON.stringify(companyData, null, 2)}

Provide a structured assessment with:
1. One-line verdict (buy/hold/watch/avoid with brief reason)
2. Bull case (2-3 key points)
3. Bear case (2-3 key risks)
4. Valuation (cheap/fair/expensive with one supporting metric)
5. Fit with a physical AI / tech-focused portfolio
6. Key metrics to watch over next 12 months

Be direct and specific. No generic disclaimers. Format as JSON with keys: verdict, bullCase, bearCase, valuation, portfolioFit, watchMetrics.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    let analysis = {};
    try {
      const text = claudeData.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { verdict: claudeData.content?.[0]?.text || "Analysis unavailable" };
    }

    return NextResponse.json({
      ok: true,
      ticker: ticker.toUpperCase(),
      data: companyData,
      analysis,
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json({ error: "Research failed", ok: false }, { status: 500 });
  }
}
