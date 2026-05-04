import type { PackSlot } from "@/lib/tracks/pack-slots";
import type { TrackFileKind } from "@/lib/types/database";

export function packSlotToTrackFileKind(slot: PackSlot): TrackFileKind {
  return slot === "cover_art" ? "cover" : "audio";
}
