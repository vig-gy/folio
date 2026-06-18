import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correct = process.env.APP_PASSWORD;
    if (!correct) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }
    if (password === correct) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }
}
