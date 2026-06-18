import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FMP_KEY = process.env.FMP_API_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

async function fetchFMP(endpoint: string) {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/${endpoint}&apikey=${FMP_KEY}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "No ticker provided" }, { status: 400 });

  try {
    // Fetch data in parallel
    const [profile, quote, income, ratios, news] = await Promise.all([
      fetchFMP(`profile/${ticker}?`),
      fetchFMP(`quote/${ticker}?`),
      fetchFMP(`income-statement/${ticker}?limit=3&`),
      fetchFMP(`ratios-ttm/${ticker}?`),
      fetchFMP(`stock_news?tickers=${ticker}&limit=5&`),
    ]);

    const companyData = {
      profile: profile?.[0] || {},
      quote: quote?.[0] || {},
      income: income?.[0] || {},
      ratios: ratios?.[0] || {},
      recentNews: news?.slice(0, 5) || [],
    };

    // Claude analysis
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
