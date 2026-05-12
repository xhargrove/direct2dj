import { isPackSlot, type PackSlot } from "@/lib/tracks/pack-slots";

const MAX_TOTAL = 200;
const MAX_TITLE = 100;
const MAX_ARTIST = 80;

const ILLEGAL = /[/\\?%*:|"<>]+/g;
const CTRL = /[\u0000-\u001f]+/g;

/** Strip characters illegal in cross-platform filenames; keep spaces for human-readable names. */
export function sanitizeHumanFilenamePart(raw: string, maxLen: number): string {
  const s0 = raw.normalize("NFC").trim().replace(ILLEGAL, "").replace(CTRL, "");
  const s1 = s0.replace(/\s+/g, " ").replace(/^\.+|\.+$/g, "").trim();
  if (!s1) return "Unknown";
  return s1.length > maxLen ? s1.slice(0, maxLen).trimEnd() : s1;
}

export function extensionFromStoragePath(path: string): string {
  const base = path.split("/").pop() ?? "";
  const i = base.lastIndexOf(".");
  if (i === -1) return "";
  const ext = base.slice(i).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : "";
}

/** Human label inside parentheses, e.g. radio_edit → "Clean" (matches DJ-facing language). */
export function djPackSlotVariantLabel(slot: PackSlot): string {
  switch (slot) {
    case "radio_edit":
      return "Clean";
    case "dirty_full":
      return "Dirty";
    case "instrumental":
      return "Instrumental";
    case "acapella":
      return "Acapella";
    case "intro_edit":
      return "Intro Edit";
    case "short_edit":
      return "Intro Dirty";
    case "cover_art":
      return "Cover";
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function fitToMaxLength(base: string, ext: string): string {
  const max = MAX_TOTAL - ext.length;
  if (base.length <= max) return base + ext;
  return base.slice(0, Math.max(1, max - 1)).trimEnd() + "..." + ext;
}

/**
 * Filename DJs see when saving pack files — human-readable, e.g.
 * `Greg Street - Hey Man Say Man (Clean).mp3` (not internal `radio_edit_…` storage keys).
 */
export function djPackDownloadFilename(input: {
  pack_slot: string | null;
  credit_artist_name: string;
  title: string;
  storage_path: string;
}): string {
  const ext = extensionFromStoragePath(input.storage_path) || ".bin";
  const artist = sanitizeHumanFilenamePart(
    input.credit_artist_name || "Artist",
    MAX_ARTIST,
  );
  const title = sanitizeHumanFilenamePart(input.title || "Track", MAX_TITLE);

  if (!input.pack_slot || !isPackSlot(input.pack_slot)) {
    return fitToMaxLength(`${artist} - ${title}`, ext);
  }

  const slot = input.pack_slot;

  let base: string;
  if (slot === "cover_art") {
    base = `${artist} - ${title} - Cover`;
  } else {
    const variant = djPackSlotVariantLabel(slot);
    base = `${artist} - ${title} (${variant})`;
  }

  return fitToMaxLength(base, ext);
}

/**
 * UI label for a pack row (matches download naming). Uses release metadata when present so
 * legacy storage keys like `radio_edit_CertifiedTexan.mp3` still read as `Artist - Title (Clean).mp3`.
 */
export function packFileDisplayName(
  file: { pack_slot: string | null; storage_path: string },
  meta: { title?: string | null; credit_artist_name?: string | null },
): string {
  const title = (meta.title ?? "").trim();
  const credit = (meta.credit_artist_name ?? "").trim();
  if (!title && !credit) {
    return file.storage_path.split("/").pop() ?? "file";
  }
  return djPackDownloadFilename({
    pack_slot: file.pack_slot,
    credit_artist_name: credit || "Artist",
    title: title || "Track",
    storage_path: file.storage_path,
  });
}
