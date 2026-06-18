import { NextResponse } from "next/server";
import { getAllSheetData } from "@/lib/sheets";
import { parsePortfolioData } from "@/lib/parser";

export const runtime = "nodejs";
export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const sheets = await getAllSheetData();
    const portfolio = parsePortfolioData(sheets);
    return NextResponse.json({ data: portfolio, ok: true });
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio data", ok: false },
      { status: 500 }
    );
  }
}
