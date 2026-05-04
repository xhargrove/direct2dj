import { NextResponse } from "next/server";
import { notifyArtistPlayVerifiedDjMonitorPro } from "@/lib/notifications/events";

/**
 * Webhook for DJ Monitor Pro (or compatible monitors) to flag verified plays.
 * Configure DJ_MONITOR_PRO_WEBHOOK_SECRET and send Authorization: Bearer <secret>.
 */
export async function POST(request: Request) {
  const secret = process.env.DJ_MONITOR_PRO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Integration not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trackId =
    body &&
    typeof body === "object" &&
    "track_id" in body &&
    typeof (body as { track_id: unknown }).track_id === "string"
      ? (body as { track_id: string }).track_id.trim()
      : "";

  if (!trackId) {
    return NextResponse.json({ error: "track_id required" }, { status: 400 });
  }

  let venue: string | null = null;
  let city: string | null = null;
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.venue === "string") venue = o.venue;
    if (typeof o.city === "string") city = o.city;
  }

  await notifyArtistPlayVerifiedDjMonitorPro(trackId, { venue, city });
  return NextResponse.json({ ok: true });
}
