import type { PackSlot } from "@/lib/tracks/pack-slots";
import { safeStorageFileName } from "@/lib/tracks/upload-rules";

const MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** File extension for storage object keys, from filename or MIME. */
export function extensionFromUploadFile(file: File): string {
  const fromName = file.name.trim().match(/(\.[A-Za-z0-9]{1,8})$/);
  if (fromName) {
    const e = fromName[1].toLowerCase();
    if (/^\.[a-z0-9]+$/.test(e)) return e;
  }
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_TO_EXT[mime] ?? ".bin";
}

/**
 * Lowercase slug for one path segment (letters/digits across scripts; separators → single `_`).
 */
export function sanitizeStorageStemSegment(raw: string, maxLen: number): string {
  const t = raw.normalize("NFKC").trim().toLowerCase();
  if (!t) return "x";
  const cleaned = t
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const s = (cleaned || "x").slice(0, maxLen);
  return s || "x";
}

/**
 * Object basename under `…/tracks/{trackId}/` — prefers release metadata so paths stay short and readable
 * instead of mirroring messy source filenames (e.g. `Hotboii___Lil_Baby_-_Alicia__Dirty_`).
 */
export function packStorageObjectBasename(
  slot: PackSlot,
  file: File,
  meta: { title?: string | null; credit_artist_name?: string | null },
): string {
  const ext = extensionFromUploadFile(file);
  const title = (meta.title ?? "").trim();
  const credit = (meta.credit_artist_name ?? "").trim();
  if (title && credit) {
    const a = sanitizeStorageStemSegment(title, 55);
    const b = sanitizeStorageStemSegment(credit, 55);
    return `${slot}_${a}_${b}${ext}`;
  }
  return `${slot}_${safeStorageFileName(file.name)}`;
}
