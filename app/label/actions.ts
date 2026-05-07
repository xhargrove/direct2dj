"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TrackMetadataPayload } from "@/app/artist/tracks/actions";
import { createClient } from "@/lib/supabase/server";
import { notifyRatedTrackUpdated } from "@/lib/notifications/events";
import { validateMetadataForSubmit, validatePackSlotsPresent } from "@/lib/tracks/submit-validation";
import type { PackSlot } from "@/lib/tracks/pack-slots";
import { requireRoles } from "@/lib/auth/require-role";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertManagesArtist(supabase: SupabaseClient, artistId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const };

  const { data: row } = await supabase
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("managed_by_label_rep_id", user.id)
    .maybeSingle();

  if (!row) return { error: "Artist not on your roster." as const };
  return { userId: user.id as string };
}

export async function labelRepCreateManagedArtist(displayName: string) {
  await requireRoles(["label_rep"]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("label_rep_create_managed_artist", {
    p_display_name: displayName.trim() || "Artist",
  });

  if (error) return { error: error.message };
  if (typeof data !== "string" || !data) {
    return { error: "Could not create artist." };
  }

  revalidatePath("/label/roster");
  return { id: data };
}

export async function createManagedArtistFromForm(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const r = await labelRepCreateManagedArtist(displayName);
  if ("error" in r) {
    redirect(`/label/roster?error=${encodeURIComponent(String(r.error))}`);
  }
  redirect(`/label/artists/${r.id}/tracks`);
}

export async function labelRepCreateDraftFromForm(formData: FormData) {
  await requireRoles(["label_rep"]);
  const artistId = String(formData.get("artist_id") ?? "").trim();
  const supabase = await createClient();

  const gate = await assertManagesArtist(supabase, artistId);
  if ("error" in gate) {
    redirect(`/label/artists/${artistId}/tracks?error=${encodeURIComponent(String(gate.error))}`);
  }

  const { data, error } = await supabase.rpc("create_label_managed_draft_track", {
    p_artist_id: artistId,
  });

  if (error || typeof data !== "string" || !data) {
    redirect(
      `/label/artists/${artistId}/tracks?error=${encodeURIComponent(error?.message ?? "Could not create draft.")}`,
    );
  }

  revalidatePath(`/label/artists/${artistId}/tracks`);
  redirect(`/label/artists/${artistId}/tracks/${data}/edit`);
}

export async function labelRepUpdateTrackMetadata(trackId: string, payload: TrackMetadataPayload) {
  await requireRoles(["label_rep"]);
  const supabase = await createClient();

  const { data: track } = await supabase.from("tracks").select("artist_id").eq("id", trackId).maybeSingle();
  if (!track) return { error: "Track not found." };

  const gate = await assertManagesArtist(supabase, track.artist_id);
  if ("error" in gate) return { error: gate.error };

  const { error } = await supabase
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
    .eq("artist_id", track.artist_id);

  if (error) return { error: error.message };

  const { data: snap } = await supabase
    .from("tracks")
    .select("title, moderation_status, is_draft")
    .eq("id", trackId)
    .maybeSingle();
  if (snap?.moderation_status === "approved" && snap.is_draft === false && typeof snap.title === "string") {
    await notifyRatedTrackUpdated(trackId, snap.title);
  }

  revalidatePath(`/label/artists/${track.artist_id}/tracks/${trackId}/edit`);
  revalidatePath(`/label/artists/${track.artist_id}/tracks`);
  return { ok: true as const };
}

export async function labelRepSubmitTrackForReview(trackId: string, meta: TrackMetadataPayload) {
  await requireRoles(["label_rep"]);
  const supabase = await createClient();

  const { data: track } = await supabase.from("tracks").select("artist_id").eq("id", trackId).maybeSingle();
  if (!track) return { error: "Track not found." };

  const gate = await assertManagesArtist(supabase, track.artist_id);
  if ("error" in gate) return { error: gate.error };

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

  const { data: files, error: filesErr } = await supabase
    .from("track_files")
    .select("pack_slot")
    .eq("track_id", trackId);

  if (filesErr) return { error: filesErr.message };

  const slots = new Set((files ?? []).map((r) => r.pack_slot).filter(Boolean) as PackSlot[]);
  const packErr = validatePackSlotsPresent(slots);
  if (packErr) return { error: packErr };

  const { error } = await supabase
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
    .eq("artist_id", track.artist_id);

  if (error) return { error: error.message };

  revalidatePath(`/label/artists/${track.artist_id}/tracks/${trackId}/edit`);
  revalidatePath(`/label/artists/${track.artist_id}/tracks`);
  return { ok: true as const };
}

export async function labelRepDeleteTrack(trackId: string) {
  await requireRoles(["label_rep"]);
  const supabase = await createClient();

  const { data: track } = await supabase
    .from("tracks")
    .select("id, artist_id, moderation_status, is_draft")
    .eq("id", trackId)
    .maybeSingle();

  if (!track) return { error: "Track not found." };

  const gate = await assertManagesArtist(supabase, track.artist_id);
  if ("error" in gate) return { error: gate.error };

  if (track.moderation_status === "approved") {
    return { error: "Published tracks cannot be deleted here." };
  }

  const { data: files } = await supabase.from("track_files").select("storage_path").eq("track_id", trackId);

  const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("promos").remove(paths);
  }

  const { error } = await supabase.from("tracks").delete().eq("id", trackId);
  if (error) return { error: error.message };

  revalidatePath(`/label/artists/${track.artist_id}/tracks`);
  return { ok: true as const };
}
