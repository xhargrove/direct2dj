import { describe, expect, it } from "vitest";
import {
  djPackDownloadFilename,
  djPackSlotVariantLabel,
  extensionFromStoragePath,
  packFileDisplayName,
  sanitizeHumanFilenamePart,
} from "@/lib/tracks/dj-download-filename";

describe("sanitizeHumanFilenamePart", () => {
  it("keeps spaces and strips path characters", () => {
    expect(sanitizeHumanFilenamePart("Make  Way", 40)).toBe("Make Way");
    expect(sanitizeHumanFilenamePart("AC/DC", 20)).toBe("ACDC");
  });

  it("returns Unknown for empty input", () => {
    expect(sanitizeHumanFilenamePart("   ", 10)).toBe("Unknown");
  });
});

describe("djPackSlotVariantLabel", () => {
  it("maps radio edit to Clean and dirty to Dirty", () => {
    expect(djPackSlotVariantLabel("radio_edit")).toBe("Clean");
    expect(djPackSlotVariantLabel("dirty_full")).toBe("Dirty");
  });
});

describe("extensionFromStoragePath", () => {
  it("reads lowercase extension from the last path segment", () => {
    expect(extensionFromStoragePath("u/t/x/radio_edit_foo.MP3")).toBe(".mp3");
    expect(extensionFromStoragePath("a/b/cover.jpg")).toBe(".jpg");
  });

  it("returns empty when missing or suspicious", () => {
    expect(extensionFromStoragePath("noext")).toBe("");
    expect(extensionFromStoragePath("weird.a1b2c3")).toBe("");
  });
});

describe("djPackDownloadFilename", () => {
  it("uses Title (Clean) - Artist for radio edit", () => {
    expect(
      djPackDownloadFilename({
        pack_slot: "radio_edit",
        credit_artist_name: "LJ Hellems",
        title: "Make Way",
        storage_path: "p/t/tid/radio_edit_01_MAKE_WAY__Clean_.mp3",
      }),
    ).toBe("Make Way (Clean) - LJ Hellems.mp3");
  });

  it("uses Title (Dirty) - Artist for dirty / full", () => {
    expect(
      djPackDownloadFilename({
        pack_slot: "dirty_full",
        credit_artist_name: "LJ Hellems",
        title: "Make Way",
        storage_path: "p/t/tid/dirty_full_x.mp3",
      }),
    ).toBe("Make Way (Dirty) - LJ Hellems.mp3");
  });

  it("uses Title - Artist - Cover for artwork", () => {
    expect(
      djPackDownloadFilename({
        pack_slot: "cover_art",
        credit_artist_name: "LJ Hellems",
        title: "Make Way",
        storage_path: "p/t/tid/cover_art_x.jpeg",
      }),
    ).toBe("Make Way - LJ Hellems - Cover.jpeg");
  });

  it("uses Title - Artist for unknown slot", () => {
    expect(
      djPackDownloadFilename({
        pack_slot: "legacy_slot",
        credit_artist_name: "A",
        title: "B",
        storage_path: "x/y/z.dat",
      }),
    ).toBe("B - A.dat");
  });
});

describe("packFileDisplayName", () => {
  it("falls back to storage basename when release metadata is empty", () => {
    expect(
      packFileDisplayName(
        { pack_slot: "radio_edit", storage_path: "p/t/tid/radio_edit_CertifiedTexan.mp3" },
        { title: "", credit_artist_name: "" },
      ),
    ).toBe("radio_edit_CertifiedTexan.mp3");
  });

  it("maps legacy key to human label when title and artist are set", () => {
    expect(
      packFileDisplayName(
        { pack_slot: "radio_edit", storage_path: "p/t/tid/radio_edit_CertifiedTexan.mp3" },
        { title: "Make Way", credit_artist_name: "LJ Hellems" },
      ),
    ).toBe("Make Way (Clean) - LJ Hellems.mp3");
  });
});
