"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/context";
import { getSiteUrl } from "@/lib/billing/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  notifyArtistPlayVerifiedAdmin,
  notifyDjApplicationResult,
  notifyApprovedDjsCatalogTrackLive,
  notifyTrackApproved,
  notifyTrackRejected,
  sweepFeaturedPlacementNotifications,
} from "@/lib/notifications/events";
import type { DjTier } from "@/lib/types/database";

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function approveTrack(trackId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error: rpcErr } = await ctx.supabase.rpc("admin_apply_track_review", {
    p_track_id: trackId,
    p_decision: "approved",
    p_rejection_reason: null,
  });

  if (rpcErr) return { error: rpcErr.message };

  await notifyTrackApproved(trackId);
  await notifyApprovedDjsCatalogTrackLive(trackId);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath("/admin/tracks");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dj/feed");
  revalidatePath(`/dj/tracks/${trackId}`);
  revalidatePath("/featured");
  return { ok: true as const };
}

export async function rejectTrack(trackId: string, reason: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const trimmed = reason.trim();
  if (!trimmed) return { error: "Rejection reason is required." };

  const { error: rpcErr } = await ctx.supabase.rpc("admin_apply_track_review", {
    p_track_id: trackId,
    p_decision: "rejected",
    p_rejection_reason: trimmed,
  });

  if (rpcErr) return { error: rpcErr.message };

  await notifyTrackRejected(trackId, trimmed);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath("/admin/tracks");
  revalidatePath("/admin/dashboard");
  return { ok: true as const };
}

export async function setTrackCatalogActive(trackId: string, catalogActive: boolean) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("tracks")
    .update({ catalog_active: catalogActive })
    .eq("id", trackId);

  if (error) return { error: error.message };

  if (catalogActive) {
    await notifyApprovedDjsCatalogTrackLive(trackId);
  }

  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath("/dj/feed");
  revalidatePath(`/dj/tracks/${trackId}`);
  return { ok: true as const };
}

export async function setTrackAdminTags(trackId: string, tagsCsv: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const tags = parseTags(tagsCsv);
  const { error } = await ctx.supabase.from("tracks").update({ admin_tags: tags }).eq("id", trackId);

  if (error) return { error: error.message };

  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/submissions/${trackId}`);
  return { ok: true as const };
}

export async function upsertFeaturedPlacement(input: {
  trackId: string;
  placementId?: string | null;
  label: string;
  startsAt: string | null;
  endsAt: string | null;
}) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const label = input.label.trim() || null;
  const startsAt = input.startsAt?.trim() || null;
  const endsAt = input.endsAt?.trim() || null;

  if (input.placementId) {
    const { error } = await ctx.supabase
      .from("featured_placements")
      .update({
        label,
        starts_at: startsAt,
        ends_at: endsAt,
        moderation_status: "approved",
      })
      .eq("id", input.placementId);
    if (error) return { error: error.message };
  } else {
    const { error } = await ctx.supabase.from("featured_placements").insert({
      track_id: input.trackId,
      label,
      starts_at: startsAt,
      ends_at: endsAt,
      moderation_status: "approved",
      activation_source: "admin_comp",
      payment_id: null,
    });
    if (error) return { error: error.message };
  }

  await sweepFeaturedPlacementNotifications();

  revalidatePath("/admin/featured");
  revalidatePath(`/admin/submissions/${input.trackId}`);
  return { ok: true as const };
}

export async function deleteFeaturedPlacement(placementId: string, trackId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase.from("featured_placements").delete().eq("id", placementId);

  if (error) return { error: error.message };

  revalidatePath("/admin/featured");
  revalidatePath(`/admin/submissions/${trackId}`);
  return { ok: true as const };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Opens a new draft for an artist without a submission checkout (admin tooling only). */
export async function adminCreateFreeDraftTrack(artistId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const trimmed = artistId.trim();
  if (!UUID_RE.test(trimmed)) {
    return { error: "Invalid artist." };
  }

  const { data, error } = await ctx.supabase.rpc("admin_create_draft_track", {
    p_artist_id: trimmed,
  });

  if (error) return { error: error.message };
  if (typeof data !== "string" || !data) {
    return { error: "Could not create draft track." };
  }

  revalidatePath("/admin/tracks");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/dashboard");
  return { id: data };
}

/**
 * Creates (if needed) a single `artists` row with profile_id = the signed-in admin, then opens a draft track.
 * Pack files use the admin's storage prefix — no separate artist login or invite.
 */
export async function adminCreateHouseDraftTrack() {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: artistId, error: ensureErr } = await ctx.supabase.rpc("admin_ensure_house_artist");
  if (ensureErr) return { error: ensureErr.message };
  if (typeof artistId !== "string" || !artistId) {
    return { error: "Could not create or load house artist. Apply migration admin_house_artist (admin_ensure_house_artist)." };
  }

  const { data: trackId, error: draftErr } = await ctx.supabase.rpc("admin_create_draft_track", {
    p_artist_id: artistId,
  });
  if (draftErr) return { error: draftErr.message };
  if (typeof trackId !== "string" || !trackId) {
    return { error: "Could not create draft track." };
  }

  revalidatePath("/admin/tracks");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/dashboard");
  return { id: trackId };
}

/** Removes promo storage objects for the track, then deletes the row (cascades related DB rows). Admin only. */
export async function adminDeleteTrack(trackId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const trimmed = trackId.trim();
  if (!UUID_RE.test(trimmed)) {
    return { error: "Invalid track." };
  }

  const { data: row, error: findErr } = await ctx.supabase.from("tracks").select("id").eq("id", trimmed).maybeSingle();
  if (findErr) return { error: findErr.message };
  if (!row) return { error: "Track not found." };

  const { data: files } = await ctx.supabase
    .from("track_files")
    .select("storage_path")
    .eq("track_id", trimmed);

  const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: rmErr } = await ctx.supabase.storage.from("promos").remove(paths);
    if (rmErr) return { error: `Could not remove storage files: ${rmErr.message}` };
  }

  const { error: delErr } = await ctx.supabase.from("tracks").delete().eq("id", trimmed);
  if (delErr) return { error: delErr.message };

  revalidatePath("/admin/tracks");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/featured");
  revalidatePath(`/admin/tracks/${trimmed}`);
  revalidatePath("/dj/feed");
  revalidatePath("/featured");
  revalidatePath("/artist/tracks");
  return { ok: true as const };
}

const DJ_TIERS: DjTier[] = [
  "verified",
  "club_dj",
  "radio_dj",
  "influencer_dj",
  "curator",
];

export async function adminApproveDj(djId: string, tierRaw: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!DJ_TIERS.includes(tierRaw as DjTier)) return { error: "Invalid tier." };
  const tier = tierRaw as DjTier;

  const { data: app, error: appErr } = await ctx.supabase
    .from("dj_applications")
    .select("dj_name, city, state")
    .eq("dj_id", djId)
    .maybeSingle();

  if (appErr) return { error: appErr.message };
  if (!app) return { error: "No application on file for this DJ." };

  const name = app.dj_name?.trim() || "DJ";
  const city = app.city?.trim() || null;
  const st = app.state?.trim() || null;

  const { error } = await ctx.supabase
    .from("djs")
    .update({
      vetting_status: "approved",
      dj_tier: tier,
      display_name: name,
      city,
      state: st,
      updated_at: new Date().toISOString(),
    })
    .eq("id", djId);

  if (error) return { error: error.message };

  const { data: djProfile } = await ctx.supabase.from("djs").select("profile_id").eq("id", djId).maybeSingle();
  if (djProfile?.profile_id) {
    await notifyDjApplicationResult(djProfile.profile_id, true);
  }

  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/djs");
  revalidatePath("/dj/feed");
  return { ok: true as const };
}

/**
 * Permanently removes a pending or rejected DJ applicant: deletes their Auth user, which cascades
 * profile + djs + application and engagement rows. Does not apply to approved/suspended DJs.
 */
export async function adminDeleteDjApplicant(djId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: row, error: selErr } = await ctx.supabase
    .from("djs")
    .select("id, profile_id, vetting_status")
    .eq("id", djId)
    .maybeSingle();

  if (selErr) return { error: selErr.message };
  if (!row) return { error: "DJ not found." };

  if (row.profile_id === ctx.userId) {
    return { error: "You cannot remove your own account." };
  }

  if (row.vetting_status !== "pending" && row.vetting_status !== "rejected") {
    return {
      error:
        "Only pending or rejected applicants can be removed. Use Suspend for approved DJs, or contact support for full removal.",
    };
  }

  const { data: prof, error: profErr } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", row.profile_id)
    .maybeSingle();

  if (profErr) return { error: profErr.message };
  if (prof?.role === "admin") {
    return { error: "Cannot delete an admin account." };
  }

  let adminClient;
  try {
    adminClient = createServiceRoleClient();
  } catch {
    return { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set." };
  }

  const { error: delErr } = await adminClient.auth.admin.deleteUser(row.profile_id);

  if (delErr) return { error: delErr.message };

  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/djs");
  return { ok: true as const };
}

export async function adminRejectDj(djId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: djProfile } = await ctx.supabase.from("djs").select("profile_id").eq("id", djId).maybeSingle();

  const { error } = await ctx.supabase
    .from("djs")
    .update({
      vetting_status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", djId);

  if (error) return { error: error.message };

  if (djProfile?.profile_id) {
    await notifyDjApplicationResult(djProfile.profile_id, false);
  }

  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/djs");
  return { ok: true as const };
}

export async function adminSuspendDj(djId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("djs")
    .update({
      vetting_status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", djId);

  if (error) return { error: error.message };

  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/djs");
  revalidatePath("/dj/feed");
  return { ok: true as const };
}

export async function adminAssignDjTier(djId: string, tierRaw: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!DJ_TIERS.includes(tierRaw as DjTier)) return { error: "Invalid tier." };
  const tier = tierRaw as DjTier;

  const { error } = await ctx.supabase
    .from("djs")
    .update({
      dj_tier: tier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", djId)
    .eq("vetting_status", "approved");

  if (error) return { error: error.message };

  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/djs");
  return { ok: true as const };
}

export async function adminApproveDjOrganization(orgId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const now = new Date().toISOString();
  const { error } = await ctx.supabase
    .from("dj_organizations")
    .update({
      moderation_status: "approved",
      reviewed_at: now,
      reviewed_by: ctx.userId,
      updated_at: now,
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/admin/dj-organizations");
  revalidatePath("/admin/dj-applications");
  return { ok: true as const };
}

export async function adminRejectDjOrganization(orgId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const now = new Date().toISOString();
  const { error } = await ctx.supabase
    .from("dj_organizations")
    .update({
      moderation_status: "rejected",
      reviewed_at: now,
      reviewed_by: ctx.userId,
      updated_at: now,
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/admin/dj-organizations");
  return { ok: true as const };
}

export async function verifyPlayReport(playReportId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("play_reports")
    .update({
      verification_status: "verified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", playReportId);

  if (error) return { error: error.message };

  await notifyArtistPlayVerifiedAdmin(playReportId);

  revalidatePath("/admin/play-reports");
  revalidatePath("/artist/play-reports");
  revalidatePath("/dj/play-reports");
  return { ok: true as const };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a new Auth user + profile + artist row with a chosen stage display name (server-only; uses service role).
 */
export async function adminCreateArtistAccount(input: {
  email: string;
  displayName: string;
  profileFullName?: string;
  mode: "invite" | "create_confirmed";
}) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const profileFullName = input.profileFullName?.trim();

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!displayName) {
    return { error: "Artist display name is required." };
  }
  if (displayName.length > 200) {
    return { error: "Display name is too long." };
  }

  const metaFullName = profileFullName || displayName;

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set." };
  }

  const redirectTo = `${getSiteUrl()}/auth/callback`;

  let userId: string | null = null;
  let methodMessage: string;

  if (input.mode === "invite") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: metaFullName },
      redirectTo,
    });

    if (error) {
      return { error: error.message };
    }
    userId = data.user?.id ?? null;
    methodMessage = "Invite sent. The user can follow the email link to finish signup.";
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: metaFullName },
      password: randomBytes(32).toString("base64url"),
    });
    if (error) {
      return { error: error.message };
    }
    userId = data.user?.id ?? null;
    methodMessage =
      "Account created with a confirmed email. The user should use “Forgot password” on the login page to set a password.";
  }

  if (!userId) {
    return { error: "User was not created." };
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      email,
      full_name: metaFullName,
      role: "artist",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileErr) {
    return { error: profileErr.message };
  }

  const { data: existingArtist, error: findArtistErr } = await admin
    .from("artists")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (findArtistErr) {
    return { error: findArtistErr.message };
  }

  if (existingArtist?.id) {
    const { error: updErr } = await admin
      .from("artists")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", existingArtist.id);
    if (updErr) {
      return { error: updErr.message };
    }
  } else {
    const { error: insErr } = await admin.from("artists").insert({
      profile_id: userId,
      display_name: displayName,
      status: "active",
    });
    if (insErr) {
      return { error: insErr.message };
    }
  }

  revalidatePath("/admin/artists");
  revalidatePath("/admin/tracks/new");

  return {
    ok: true as const,
    message: `${methodMessage} Artist display name set to “${displayName}”.`,
  };
}

export async function adminUpdateArtist(
  artistId: string,
  input: {
    display_name: string;
    bio: string | null;
    status: "active" | "inactive";
  },
) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const name = input.display_name.trim();
  if (name.length < 2) return { error: "Display name must be at least 2 characters." };
  if (name.length > 120) return { error: "Display name must be 120 characters or less." };

  const bioRaw = input.bio?.trim() ?? "";
  const bio = bioRaw.length === 0 ? null : bioRaw;
  if (bio && bio.length > 2000) return { error: "Bio must be 2000 characters or less." };

  const { error } = await ctx.supabase
    .from("artists")
    .update({
      display_name: name,
      bio,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", artistId);

  if (error) return { error: error.message };

  revalidatePath("/admin/artists");
  revalidatePath(`/admin/artists/${artistId}`);
  revalidatePath("/admin/tracks");
  return { ok: true as const };
}
