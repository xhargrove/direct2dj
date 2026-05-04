import "server-only";

import { emitNotifications, type EmitNotificationInput } from "@/lib/notifications/service";
import type { NotificationKind } from "@/lib/notifications/types";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";

type TrackArtist = {
  id: string;
  title: string;
  artists: { profile_id: string } | null;
};

function asTrackArtist(raw: unknown): TrackArtist | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const artists = o.artists as { profile_id?: string } | null;
  if (!o.id || typeof o.title !== "string" || !artists?.profile_id) return null;
  return { id: String(o.id), title: o.title, artists: { profile_id: artists.profile_id } };
}

/** Processes pending featured “started” and past “expired” alerts (idempotent via *_notified_at columns). */
export async function sweepFeaturedPlacementNotifications(): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const now = new Date();
  const nowIso = now.toISOString();
  const expiryLowerBound = new Date(now.getTime() - 90 * 86400000).toISOString();

  const { data: startCandidates } = await admin
    .from("featured_placements")
    .select(
      `
      id,
      label,
      starts_at,
      ends_at,
      track_id,
      tracks (
        id,
        title,
        artists ( profile_id )
      )
    `,
    )
    .eq("moderation_status", "approved")
    .is("start_notified_at", null);

  for (const fp of startCandidates ?? []) {
    const start = fp.starts_at ? new Date(fp.starts_at as string) : new Date(0);
    const end = fp.ends_at ? new Date(fp.ends_at as string) : null;
    if (start > now) continue;
    if (end && end <= now) continue;

    const track = asTrackArtist(fp.tracks);
    const artistPid = track?.artists?.profile_id;
    if (!track || !artistPid) continue;

    const { data: djRows } = await admin.from("djs").select("profile_id").eq("vetting_status", "approved");

    const label = typeof fp.label === "string" ? fp.label : null;
    const placementId = fp.id as string;

    const rows: EmitNotificationInput[] = [
      {
        userId: artistPid,
        kind: "featured_started_artist",
        title: "Featured placement is live",
        body: `“${track.title}” is featured${label ? ` (${label})` : ""}.`,
        metadata: {
          track_id: track.id,
          placement_id: placementId,
          href: `/artist/tracks/${track.id}`,
        },
      },
    ];

    const djKind: NotificationKind = "featured_new_for_dj";
    for (const d of djRows ?? []) {
      const pid = d.profile_id as string;
      if (!pid) continue;
      rows.push({
        userId: pid,
        kind: djKind,
        title: "New featured track",
        body: `${track.title} is now featured on the feed.`,
        metadata: {
          track_id: track.id,
          placement_id: placementId,
          href: "/dj/feed",
        },
      });
    }

    await emitNotifications(rows);

    await admin
      .from("featured_placements")
      .update({ start_notified_at: nowIso })
      .eq("id", placementId);
  }

  const { data: expiryCandidates } = await admin
    .from("featured_placements")
    .select(
      `
      id,
      ends_at,
      track_id,
      tracks (
        id,
        title,
        artists ( profile_id )
      )
    `,
    )
    .eq("moderation_status", "approved")
    .is("expiry_notified_at", null)
    .lt("ends_at", nowIso)
    .gt("ends_at", expiryLowerBound);

  for (const fp of expiryCandidates ?? []) {
    const track = asTrackArtist(fp.tracks);
    const artistPid = track?.artists?.profile_id;
    if (!track || !artistPid) continue;

    await emitNotifications([
      {
        userId: artistPid,
        kind: "featured_expired_artist",
        title: "Featured placement ended",
        body: `The featured window for “${track.title}” has ended.`,
        metadata: {
          track_id: track.id,
          placement_id: fp.id as string,
          href: `/artist/tracks/${track.id}`,
        },
      },
    ]);

    await admin
      .from("featured_placements")
      .update({ expiry_notified_at: nowIso })
      .eq("id", fp.id as string);
  }
}
