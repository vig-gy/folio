import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

const PORTFOLIO_CONTEXT = `
You are Folio AI, a personal financial advisor embedded in Vignesh's portfolio app.

About Vignesh:
- 28 years old, Singapore-based, working in AI strategy in financial services
- Investment horizon: 32 years (target withdrawal at 60)
- Investment thesis: 90% equities (80% index, 10-15% individual stocks), 5% bonds (SSBs), 5% crypto+gold
- Cash target: SGD 10-12k steady state
- Key holdings: VWRA (global index), VOO (S&P500), NVDA, XPEV, MU, CEG, GOOGL, ZS, NOW, IAU, IBIT, ETHA, SSBs
- Physical AI is a core thesis: believes in humanoid robotics and embodied AI as next frontier
- Dad's capital: ~SGD 30k invested in VWRA on behalf of his father (56), 5-7 year horizon, interest-free
- GXS loan: SGD 7,452 at 4.09%, bullet repayment of ~SGD 6,480 due Oct 2026
- Platforms: IBKR (primary), moomoo (MMF access), Tiger, Webull
- No dependants, stable income
`;

export async function POST(req: NextRequest) {
  try {
    const { message, portfolioData, history } = await req.json();

    const systemPrompt = `${PORTFOLIO_CONTEXT}

Current portfolio data:
${JSON.stringify(portfolioData, null, 2)}

You are having a conversation with Vignesh about his portfolio. Be direct, specific, and analytical. 
Reference actual numbers from his portfolio. No generic disclaimers. 
Keep responses concise for mobile reading (3-5 short paragraphs max).
When giving recommendations, be specific about amounts and actions.`;

    const messages = [
      ...(history || []),
      { role: "user", content: message },
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await res.json();
    const reply = data.content?.[0]?.text || "I couldn't generate a response.";

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analysis failed", ok: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const portfolioDataStr = req.nextUrl.searchParams.get("data");
  if (!portfolioDataStr) return NextResponse.json({ error: "No data" }, { status: 400 });

  try {
    const portfolioData = JSON.parse(decodeURIComponent(portfolioDataStr));

    const prompt = `${PORTFOLIO_CONTEXT}

Current portfolio:
${JSON.stringify(portfolioData, null, 2)}

Generate a concise portfolio health report with:
1. Overall health score (1-10) with one-line reason
2. Top 3 actionable recommendations right now (specific, numbered)
3. Key risks to watch (max 3)
4. One positive highlight

Format as JSON: { healthScore, healthReason, recommendations: [{action, detail, priority}], risks: [string], highlight: string }`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await res.json();
    let analysis = {};
    try {
      const text = data.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { healthScore: 7, healthReason: data.content?.[0]?.text };
    }

    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    console.error("Auto-analysis error:", error);
    return NextResponse.json({ error: "Analysis failed", ok: false }, { status: 500 });
  }
}
