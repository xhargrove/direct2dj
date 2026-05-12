import { describe, expect, it } from "vitest";
import {
  allowedMimeForSlot,
  assertMimeForSlot,
  safeStorageFileName,
} from "@/lib/tracks/upload-rules";
import { validatePackSlotsPresent } from "@/lib/tracks/submit-validation";
import type { PackSlot } from "@/lib/tracks/pack-slots";

describe("artist pack upload — MIME rules (matches DjPackUploader client checks)", () => {
  it("allows JPEG / PNG / WebP for cover_art", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
      expect(allowedMimeForSlot("cover_art", mime)).toBe(true);
      expect(() => assertMimeForSlot("cover_art", mime)).not.toThrow();
    }
  });

  it("rejects non-images for cover_art", () => {
    expect(allowedMimeForSlot("cover_art", "audio/mpeg")).toBe(false);
    expect(() => assertMimeForSlot("cover_art", "audio/mpeg")).toThrow(/Cover must be JPEG/);
  });

  it("allows common audio types for radio_edit", () => {
    for (const mime of ["audio/mpeg", "audio/mp3", "audio/wav", "audio/flac", "audio/mp4"]) {
      expect(allowedMimeForSlot("radio_edit", mime)).toBe(true);
      expect(() => assertMimeForSlot("radio_edit", mime)).not.toThrow();
    }
  });

  it("rejects images for audio slots", () => {
    expect(() => assertMimeForSlot("radio_edit", "image/jpeg")).toThrow(/Audio must be MP3/);
  });

  it("handles MIME strings with charset suffix", () => {
    expect(allowedMimeForSlot("radio_edit", "audio/mpeg; codecs=mp3")).toBe(true);
    expect(() => assertMimeForSlot("radio_edit", "audio/mpeg; codecs=mp3")).not.toThrow();
  });
});

describe("artist pack upload — submit gate (matches submitTrackForReview)", () => {
  it("succeeds when cover_art and at least one essential audio slot exist", () => {
    expect(
      validatePackSlotsPresent(new Set<PackSlot | null | undefined>(["cover_art", "radio_edit"])),
    ).toBeNull();
    expect(
      validatePackSlotsPresent(new Set<PackSlot | null | undefined>(["cover_art", "dirty_full"])),
    ).toBeNull();
    expect(
      validatePackSlotsPresent(
        new Set<PackSlot | null | undefined>(["cover_art", "radio_edit", "dirty_full"]),
      ),
    ).toBeNull();
  });

  it("fails without cover_art", () => {
    expect(validatePackSlotsPresent(new Set(["radio_edit"]))).toMatch(/Cover artwork is required/);
  });

  it("fails without radio_edit or dirty_full", () => {
    expect(
      validatePackSlotsPresent(new Set<PackSlot | null | undefined>(["cover_art", "instrumental"])),
    ).toMatch(/main audio file/);
  });
});

describe("artist pack upload — storage object naming", () => {
  it("sanitizes unsafe file names for promos bucket paths", () => {
    expect(safeStorageFileName("My Track (!).mp3")).toBe("My_Track_.mp3");
    /** Basename only — directory segments are dropped (see upload-rules). */
    expect(safeStorageFileName("../../evil.wav")).toBe("evil.wav");
  });
});

describe("promo storage path shape (browser upload builds profileId/tracks/trackId/slot_file)", () => {
  it("documents expected segment order for artist uploads", () => {
    const profileId = "11111111-1111-1111-1111-111111111111";
    const trackId = "22222222-2222-2222-2222-222222222222";
    const slot = "radio_edit";
    const file = "song.mp3";
    const path = `${profileId}/tracks/${trackId}/${slot}_${safeStorageFileName(file)}`;
    expect(path).toBe(
      "11111111-1111-1111-1111-111111111111/tracks/22222222-2222-2222-2222-222222222222/radio_edit_song.mp3",
    );
  });
});
