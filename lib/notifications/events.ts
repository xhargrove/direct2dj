import "server-only";

import { emitNotification, emitNotifications } from "@/lib/notifications/service";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";

export { sweepFeaturedPlacementNotifications } from "@/lib/notifications/featured-sweep";

export async function notifyTrackApproved(trackId: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  await emitNotification({
    userId,
    kind: "track_approved",
    title: "Track approved",
    body: `“${title}” was approved and can appear in the DJ catalog when catalog visibility is on.`,
    metadata: { track_id: trackId, href: `/artist/tracks/${trackId}` },
  });
}

export async function notifyTrackRejected(trackId: string, reason: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  await emitNotification({
    userId,
    kind: "track_rejected",
    title: "Track not approved",
    body: `“${title}” was not approved. Reason: ${reason}`,
    metadata: { track_id: trackId, href: `/artist/tracks/${trackId}/edit` },
  });
}

export async function notifyTrackDownloaded(trackId: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  await emitNotification({
    userId,
    kind: "track_downloaded",
    title: "Track downloaded",
    body: `A DJ downloaded “${title}”.`,
    metadata: { track_id: trackId, href: `/artist/tracks/${trackId}` },
  });
}

export async function notifyTrackRated(
  trackId: string,
  score: number,
  isUpdate: boolean,
): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  await emitNotification({
    userId,
    kind: isUpdate ? "track_rating_updated" : "track_rated",
    title: isUpdate ? "Rating updated" : "New rating",
    body: isUpdate
      ? `A DJ updated their rating for “${title}” to ${score}/5.`
      : `A DJ rated “${title}” ${score}/5.`,
    metadata: { track_id: trackId, href: `/artist/tracks/${trackId}` },
  });
}

export async function notifyTrackFeedback(trackId: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  await emitNotification({
    userId,
    kind: "track_feedback",
    title: "New feedback",
    body: `A DJ left feedback on “${title}”.`,
    metadata: { track_id: trackId, href: `/artist/tracks/${trackId}` },
  });
}

export async function notifyTrackPlayReported(trackId: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  await emitNotification({
    userId,
    kind: "track_play_reported",
    title: "Play reported",
    body: `A DJ reported playing “${title}”.`,
    metadata: { track_id: trackId, href: `/artist/play-reports` },
  });
}

export async function notifyArtistPlayVerifiedAdmin(playReportId: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("play_reports")
    .select(
      `
      id,
      tracks (
        id,
        title,
        artists ( profile_id )
      )
    `,
    )
    .eq("id", playReportId)
    .maybeSingle();

  const tracks = row?.tracks as { id?: string; title?: string; artists?: { profile_id?: string } } | null;
  const userId = tracks?.artists?.profile_id;
  const title = typeof tracks?.title === "string" ? tracks.title : "Your track";
  const tid = tracks?.id;
  if (!userId || !tid) return;

  await emitNotification({
    userId,
    kind: "play_verified_admin",
    title: "Play verified",
    body: `An admin verified a play report for “${title}”.`,
    metadata: {
      track_id: tid,
      play_report_id: playReportId,
      href: `/artist/play-reports`,
      verified_by: "admin",
    },
  });
}

/** Called when DJ Monitor Pro (or another integration) confirms a verified play off-platform. */
export async function notifyArtistPlayVerifiedDjMonitorPro(
  trackId: string,
  detail?: { venue?: string | null; city?: string | null },
): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: row } = await admin
    .from("tracks")
    .select(
      `
      title,
      artists ( profile_id )
    `,
    )
    .eq("id", trackId)
    .maybeSingle();

  const artists = row?.artists as { profile_id?: string } | null;
  const userId = artists?.profile_id;
  const title = typeof row?.title === "string" ? row.title : "Your track";
  if (!userId) return;

  const place = [detail?.venue, detail?.city].filter(Boolean).join(" · ");
  await emitNotification({
    userId,
    kind: "play_verified_dj_monitor_pro",
    title: "Verified play (DJ Monitor Pro)",
    body: place
      ? `DJ Monitor Pro reported a verified play for “${title}” (${place}).`
      : `DJ Monitor Pro reported a verified play for “${title}”.`,
    metadata: {
      track_id: trackId,
      href: `/artist/play-reports`,
      source: "dj_monitor_pro",
    },
  });
}

export async function notifyRatedTrackUpdated(trackId: string, trackTitle: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: ratings } = await admin
    .from("ratings")
    .select(
      `
      dj_id,
      djs ( profile_id )
    `,
    )
    .eq("track_id", trackId);

  const rows: { userId: string }[] = [];
  for (const r of ratings ?? []) {
    const djs = r.djs as { profile_id?: string } | null;
    const pid = djs?.profile_id;
    if (pid) rows.push({ userId: pid });
  }

  const dedupe = new Map<string, true>();
  const out: typeof rows = [];
  for (const x of rows) {
    if (dedupe.has(x.userId)) continue;
    dedupe.set(x.userId, true);
    out.push(x);
  }

  await emitNotifications(
    out.map((x) => ({
      userId: x.userId,
      kind: "rated_track_updated" as const,
      title: "Track you rated was updated",
      body: `“${trackTitle}” was updated by the artist.`,
      metadata: { track_id: trackId, href: `/dj/tracks/${trackId}` },
    })),
  );
}

export async function notifyDjApplicationResult(djProfileId: string, approved: boolean): Promise<void> {
  await emitNotification({
    userId: djProfileId,
    kind: approved ? "dj_application_approved" : "dj_application_rejected",
    title: approved ? "Application approved" : "Application update",
    body: approved
      ? "Your DJ application was approved. You now have promo pool access."
      : "Your DJ application was not approved. You can review your status and apply again when eligible.",
    metadata: { href: approved ? "/dj/feed" : "/dj/application-status" },
  });
}

const DJ_NOTIFY_CHUNK = 150;

/**
 * Notify all **approved** DJs when a track becomes visible in Discover (approved + catalog_active).
 * Runs once per track (`tracks.dj_catalog_notify_sent_at`).
 */
export async function notifyApprovedDjsCatalogTrackLive(trackId: string): Promise<void> {
  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: track } = await admin
    .from("tracks")
    .select("id, title, genre, moderation_status, catalog_active, dj_catalog_notify_sent_at")
    .eq("id", trackId)
    .maybeSingle();

  if (!track) return;
  if (track.moderation_status !== "approved" || track.catalog_active !== true) return;
  if (track.dj_catalog_notify_sent_at) return;

  const title =
    typeof track.title === "string" && track.title.trim().length > 0 ? track.title.trim() : "New track";
  const genre = typeof track.genre === "string" && track.genre.trim().length > 0 ? track.genre.trim() : null;

  const { data: djRows, error: djErr } = await admin
    .from("djs")
    .select("profile_id")
    .eq("vetting_status", "approved");

  if (djErr) {
    console.error("[notifications] notifyApprovedDjsCatalogTrackLive dj query:", djErr.message);
    return;
  }

  const userIds = [
    ...new Set((djRows ?? []).map((r) => r.profile_id).filter((id): id is string => typeof id === "string")),
  ];
  if (userIds.length === 0) return;

  const body = genre
    ? `“${title}” (${genre}) is live in Discover — open it in your DJ deck.`
    : `“${title}” is live in Discover — open it in your DJ deck.`;

  for (let i = 0; i < userIds.length; i += DJ_NOTIFY_CHUNK) {
    const slice = userIds.slice(i, i + DJ_NOTIFY_CHUNK);
    await emitNotifications(
      slice.map((userId) => ({
        userId,
        kind: "catalog_new_track" as const,
        title: "New track in Discover",
        body,
        metadata: { track_id: trackId, href: `/dj/tracks/${trackId}` },
      })),
    );
  }

  const { error: markErr } = await admin
    .from("tracks")
    .update({ dj_catalog_notify_sent_at: new Date().toISOString() })
    .eq("id", trackId);

  if (markErr) {
    console.error("[notifications] dj_catalog_notify_sent_at update failed:", markErr.message);
  }
}
