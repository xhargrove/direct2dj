import type { PackSlot } from "@/lib/tracks/pack-slots";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);

export function allowedMimeForSlot(slot: PackSlot, mime: string): boolean {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (slot === "cover_art") {
    return IMAGE_TYPES.has(m);
  }
  return AUDIO_TYPES.has(m);
}

export function safeStorageFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120);
}

export function assertMimeForSlot(slot: PackSlot, mime: string): void {
  if (!allowedMimeForSlot(slot, mime)) {
    throw new Error(
      slot === "cover_art"
        ? "Cover must be JPEG, PNG, or WebP."
        : "Audio must be MP3, WAV, FLAC, M4A, or AAC.",
    );
  }
}
