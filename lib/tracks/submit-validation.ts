import type { PackSlot } from "@/lib/tracks/pack-slots";
import { REQUIRED_PACK_SLOTS } from "@/lib/tracks/pack-slots";

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
  if (!meta.musical_key?.trim()) return "Key is required.";
  if (!meta.release_date?.trim()) return "Release date is required.";
  if (!meta.description?.trim()) return "Description is required.";
  /* campaign_notes optional */
  return null;
}

export function validatePackSlotsPresent(
  slotsPresent: Set<PackSlot | null | undefined>,
): string | null {
  for (const req of REQUIRED_PACK_SLOTS) {
    if (!slotsPresent.has(req)) {
      return `Missing required file: ${req.replace(/_/g, " ")}`;
    }
  }
  return null;
}
