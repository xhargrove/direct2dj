"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/context";
import type { EditorialSpotlightSectionId } from "@/lib/spotlight/load-spotlight-hub";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function assignEditorialSpotlight(input: {
  slotType: EditorialSpotlightSectionId;
  trackId: string;
  headline?: string;
  startsAt?: string;
  endsAt?: string;
}) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const trackId = input.trackId.trim();
  if (!UUID_RE.test(trackId)) return { error: "Invalid track." };

  const { data: track } = await ctx.supabase
    .from("tracks")
    .select("id, moderation_status, catalog_active, is_draft")
    .eq("id", trackId)
    .maybeSingle();

  if (!track) return { error: "Track not found." };
  if (track.moderation_status !== "approved" || track.is_draft || track.catalog_active === false) {
    return { error: "Track must be approved, non-draft, and visible in catalog." };
  }

  const startsAt = input.startsAt?.trim() || new Date().toISOString();
  const endsAt = input.endsAt?.trim() || null;
  const headline = input.headline?.trim() || null;

  const { error } = await ctx.supabase.from("editorial_spotlights").insert({
    slot_type: input.slotType,
    track_id: trackId,
    headline,
    starts_at: startsAt,
    ends_at: endsAt,
    created_by: ctx.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/spotlights");
  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath("/dj/feed");
  return { ok: true as const };
}

export async function endEditorialSpotlight(spotlightId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const id = spotlightId.trim();
  if (!UUID_RE.test(id)) return { error: "Invalid spotlight id." };

  const { error } = await ctx.supabase
    .from("editorial_spotlights")
    .update({ ends_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/spotlights");
  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath("/dj/feed");
  return { ok: true as const };
}
