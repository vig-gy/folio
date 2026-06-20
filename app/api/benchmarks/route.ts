import { NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";

export const runtime  = "nodejs";
export const revalidate = 86400; // 24-hour cache

// v3 default export is the class constructor, not an instance
const yf = new (YahooFinanceClass as any)({ suppressNotices: ["ripHistorical"] });

const FROM = new Date("2022-02-01"); // cover full investment history back to first deposit (Mar 2022)

type PriceMap = Record<string, number>; // "YYYY-MM" → monthly closing price

async function fetchMonthlyPrices(ticker: string): Promise<PriceMap> {
  try {
    const result: any = await yf.chart(ticker, {
      period1: FROM,
      period2: new Date(),
      interval: "1mo",
    });
    const quotes: any[] = result?.quotes ?? [];
    const map: PriceMap = {};
    for (const row of quotes) {
      if (!row.date) continue;
      const d = new Date(row.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const price = row.adjclose ?? row.adjClose ?? row.close;
      if (price) map[key] = price;
    }
    return map;
  } catch (e) {
    console.error(`fetchMonthlyPrices(${ticker}):`, e);
    return {};
  }
}

export async function GET() {
  const [voo, qqq, vwra] = await Promise.allSettled([
    fetchMonthlyPrices("VOO"),
    fetchMonthlyPrices("QQQ"),
    fetchMonthlyPrices("VWRA.L"),
  ]);

  return NextResponse.json({
    ok: true,
    prices: {
      VOO:  voo.status  === "fulfilled" ? voo.value  : {},
      QQQ:  qqq.status  === "fulfilled" ? qqq.value  : {},
      VWRA: vwra.status === "fulfilled" ? vwra.value : {},
    },
  });
}
