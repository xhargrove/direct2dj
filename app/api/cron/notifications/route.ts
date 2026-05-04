import { NextResponse } from "next/server";
import { sweepFeaturedPlacementNotifications } from "@/lib/notifications/events";

/** Featured placement start/expiry sweeps + callable after deploys. Protect with CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sweepFeaturedPlacementNotifications();
  return NextResponse.json({ ok: true });
}
