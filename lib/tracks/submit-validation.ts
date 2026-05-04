import type { PackSlot } from "@/lib/tracks/pack-slots";
import { ESSENTIAL_AUDIO_SLOTS, REQUIRED_COVER_SLOT } from "@/lib/tracks/pack-slots";

export type TrackMetadataInput = {
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

export function validateMetadataForSubmit(meta: TrackMetadataInput): string | null {
  const t = meta.title?.trim();
  if (!t) return "Song title is required.";
  if (!meta.credit_artist_name?.trim()) return "Artist name is required.";
  if (!meta.genre?.trim()) return "Genre is required.";
  if (meta.bpm == null || Number.isNaN(meta.bpm) || meta.bpm <= 0 || meta.bpm > 999) {
    return "BPM must be between 1 and 999.";
  }
  if (!meta.release_date?.trim()) return "Release date is required.";
  if (!meta.description?.trim()) return "Description is required.";
  /* campaign_notes optional */
  return null;
}

/** Requires cover artwork plus at least one of radio_edit or dirty_full. */
export function validatePackSlotsPresent(
  slotsPresent: Set<PackSlot | null | undefined>,
): string | null {
  if (!slotsPresent.has(REQUIRED_COVER_SLOT)) {
    return "Cover artwork is required.";
  }
  const hasEssential = ESSENTIAL_AUDIO_SLOTS.some((slot) => slotsPresent.has(slot));
  if (!hasEssential) {
    return "Upload at least one main audio file: radio edit and/or dirty / full version.";
  }
  return null;
}
