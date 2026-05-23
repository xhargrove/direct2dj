import type { TrackFile } from "@/lib/types/database";

export type PackUploadReadiness = {
  hasCover: boolean;
  hasMainAudio: boolean;
  ready: boolean;
  missing: string[];
};

/** Minimum pack requirements (cover + main audio) for upload QA. */
export function assessPackUploadReadiness(files: TrackFile[]): PackUploadReadiness {
  const hasCover = files.some(
    (f) => f.pack_slot === "cover_art" || f.kind === "cover",
  );
  const hasMainAudio = files.some(
    (f) =>
      f.kind === "audio" &&
      (f.pack_slot === "radio_edit" ||
        f.pack_slot === "dirty_full" ||
        f.pack_slot === "intro_edit" ||
        f.pack_slot === "short_edit" ||
        !f.pack_slot),
  );

  const missing: string[] = [];
  if (!hasCover) missing.push("Cover artwork");
  if (!hasMainAudio) missing.push("Main audio (radio edit, dirty full, or similar)");

  return {
    hasCover,
    hasMainAudio,
    ready: hasCover && hasMainAudio,
    missing,
  };
}
