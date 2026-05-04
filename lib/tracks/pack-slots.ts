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

export const REQUIRED_PACK_SLOTS: PackSlot[] = [
  "cover_art",
  "radio_edit",
  "dirty_full",
  "instrumental",
  "acapella",
];

export const OPTIONAL_PACK_SLOTS: PackSlot[] = ["intro_edit", "short_edit"];

export const PACK_SLOT_LABELS: Record<PackSlot, string> = {
  cover_art: "Cover artwork",
  radio_edit: "Radio edit",
  dirty_full: "Dirty / full version",
  instrumental: "Instrumental",
  acapella: "Acapella",
  intro_edit: "Intro edit (optional)",
  short_edit: "Short edit (optional)",
};

export function isPackSlot(value: string): value is PackSlot {
  return (PACK_SLOTS as readonly string[]).includes(value);
}
