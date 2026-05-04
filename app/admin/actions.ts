"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/context";
import {
  notifyArtistPlayVerifiedAdmin,
  notifyDjApplicationResult,
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

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath("/admin/tracks");
  revalidatePath("/admin/dashboard");
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

  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath(`/admin/tracks/${trackId}`);
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
