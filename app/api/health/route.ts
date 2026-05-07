import { NextResponse } from "next/server";

/** Minimal liveness check — no secrets, no DB. Safe for production. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
