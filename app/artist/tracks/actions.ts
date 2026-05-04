"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyRatedTrackUpdated } from "@/lib/notifications/events";
import { validateMetadataForSubmit, validatePackSlotsPresent } from "@/lib/tracks/submit-validation";
import type { PackSlot } from "@/lib/tracks/pack-slots";

async function getArtistContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: "Not signed in." as const };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    return { error: profileErr.message };
  }

  const { data: found, error: artistErr } = await supabase
    .from("artists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (artistErr) {
    return { error: artistErr.message };
  }

  let artist = found;
  if (!artist) {
    if (profile?.role !== "artist") {
      return { error: "No artist profile found." as const };
    }
    const displayName = (typeof profile.full_name === "string" && profile.full_name.trim().length > 0
      ? profile.full_name.trim()
      : "Artist");
    const { data: created, error: insErr } = await supabase
      .from("artists")
      .insert({
        profile_id: user.id,
        display_name: displayName,
        status: "active",
      })
      .select("id")
      .single();
    if (insErr) {
      const { data: raced } = await supabase
        .from("artists")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (raced) {
        artist = raced;
      } else {
        return { error: insErr.message };
      }
    } else if (created) {
      artist = created;
    } else {
      return { error: "Could not create artist profile." as const };
    }
  }

  return { supabase, userId: user.id, artistId: artist.id };
}

export async function createDraftTrack() {
  const ctx = await getArtistContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase.rpc("create_draft_track");

  if (error) {
    return { error: error.message };
  }
  if (typeof data !== "string" || !data) {
    return { error: "Could not create draft (no id returned)." };
  }
  revalidatePath("/artist/tracks");
  return { id: data };
}

export type TrackMetadataPayload = {
  title: string;
  credit_artist_name: string;
  featured_artist: string;
  producer: string;
  genre: string;
  bpm: number | null;
  musical_key: string;
  explicit_rating: "explicit" | "clean";
  release_date: string | null;
  description: string;
  campaign_notes: string;
};

export async function updateTrackMetadata(trackId: string, payload: TrackMetadataPayload) {
  const ctx = await getArtistContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("tracks")
    .update({
      title: payload.title.trim() || "Untitled draft",
      credit_artist_name: payload.credit_artist_name.trim(),
      featured_artist: payload.featured_artist.trim() || null,
      producer: payload.producer.trim() || null,
      genre: payload.genre.trim(),
      bpm: payload.bpm,
      musical_key: payload.musical_key.trim() || null,
      explicit_rating: payload.explicit_rating,
      release_date: payload.release_date || null,
      description: payload.description.trim() || null,
      campaign_notes: payload.campaign_notes.trim() || null,
    })
    .eq("id", trackId)
    .eq("artist_id", ctx.artistId);

  if (error) return { error: error.message };

  const { data: snap } = await ctx.supabase
    .from("tracks")
    .select("title, moderation_status, is_draft")
    .eq("id", trackId)
    .maybeSingle();
  if (snap?.moderation_status === "approved" && snap.is_draft === false && typeof snap.title === "string") {
    await notifyRatedTrackUpdated(trackId, snap.title);
  }

  revalidatePath(`/artist/tracks/${trackId}`);
  revalidatePath(`/artist/tracks/${trackId}/edit`);
  revalidatePath("/artist/tracks");
  return { ok: true as const };
}

export async function submitTrackForReview(trackId: string, meta: TrackMetadataPayload) {
  const ctx = await getArtistContext();
  if ("error" in ctx) return { error: ctx.error };

  const metaErr = validateMetadataForSubmit({
    title: meta.title,
    credit_artist_name: meta.credit_artist_name,
    featured_artist: meta.featured_artist,
    producer: meta.producer,
    genre: meta.genre,
    bpm: meta.bpm,
    musical_key: meta.musical_key,
    explicit_rating: meta.explicit_rating,
    release_date: meta.release_date,
    description: meta.description,
    campaign_notes: meta.campaign_notes,
  });
  if (metaErr) return { error: metaErr };

  const { data: files, error: filesErr } = await ctx.supabase
    .from("track_files")
    .select("pack_slot")
    .eq("track_id", trackId);

  if (filesErr) return { error: filesErr.message };

  const slots = new Set(
    (files ?? []).map((r) => r.pack_slot).filter(Boolean) as PackSlot[],
  );
  const packErr = validatePackSlotsPresent(slots);
  if (packErr) return { error: packErr };

  const { error } = await ctx.supabase
    .from("tracks")
    .update({
      title: meta.title.trim(),
      credit_artist_name: meta.credit_artist_name.trim(),
      featured_artist: meta.featured_artist.trim() || null,
      producer: meta.producer.trim() || null,
      genre: meta.genre.trim(),
      bpm: meta.bpm,
      musical_key: meta.musical_key.trim() || null,
      explicit_rating: meta.explicit_rating,
      release_date: meta.release_date || null,
      description: meta.description.trim() || null,
      campaign_notes: meta.campaign_notes.trim() || null,
      is_draft: false,
      moderation_status: "pending",
    })
    .eq("id", trackId)
    .eq("artist_id", ctx.artistId);

  if (error) return { error: error.message };

  revalidatePath(`/artist/tracks/${trackId}`);
  revalidatePath(`/artist/tracks/${trackId}/edit`);
  revalidatePath("/artist/tracks");
  return { ok: true as const };
}

export async function deleteTrack(trackId: string) {
  const ctx = await getArtistContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: track } = await ctx.supabase
    .from("tracks")
    .select("id, moderation_status, is_draft")
    .eq("id", trackId)
    .eq("artist_id", ctx.artistId)
    .maybeSingle();

  if (!track) return { error: "Track not found." };
  if (track.moderation_status === "approved") {
    return { error: "Published tracks cannot be deleted here." };
  }

  const { data: files } = await ctx.supabase
    .from("track_files")
    .select("storage_path")
    .eq("track_id", trackId);

  const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await ctx.supabase.storage.from("promos").remove(paths);
  }

  const { error } = await ctx.supabase.from("tracks").delete().eq("id", trackId);
  if (error) return { error: error.message };

  revalidatePath("/artist/tracks");
  return { ok: true as const };
}
