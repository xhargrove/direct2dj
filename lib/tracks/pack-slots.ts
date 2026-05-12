/** DJ pack file slots — Postgres enum `pack_slot` must stay in sync. */

export const PACK_SLOTS = [
  "cover_art",
  "radio_edit",
  "dirty_full",
  "instrumental",
  "acapella",
  "intro_edit",
  "short_edit",
] as const;

export type PackSlot = (typeof PACK_SLOTS)[number];

/** Cover image — required for every submission. */
export const REQUIRED_COVER_SLOT: PackSlot = "cover_art";

/**
 * Submit rule: at least one of these two must be present (upload both, or either).
 */
export const ESSENTIAL_AUDIO_SLOTS: PackSlot[] = ["radio_edit", "dirty_full"];

/** Optional stems (not required to submit). */
export const ADDITIONAL_PACK_SLOTS: PackSlot[] = ["instrumental", "acapella"];

/** Extra optional edits. */
export const OPTIONAL_PACK_SLOTS: PackSlot[] = ["intro_edit", "short_edit"];

export const PACK_SLOT_LABELS: Record<PackSlot, string> = {
  cover_art: "Cover artwork",
  radio_edit: "Radio edit",
  dirty_full: "Dirty / full version",
  instrumental: "Instrumental",
  acapella: "Acapella",
  intro_edit: "Intro edit (optional)",
  short_edit: "Intro Dirty (optional)",
};

export function isPackSlot(value: string): value is PackSlot {
  return (PACK_SLOTS as readonly string[]).includes(value);
}
