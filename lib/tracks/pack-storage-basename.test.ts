import { describe, expect, it } from "vitest";
import { packStorageObjectBasename, sanitizeStorageStemSegment } from "@/lib/tracks/pack-storage-basename";

describe("sanitizeStorageStemSegment", () => {
  it("collapses punctuation and spaces to single underscores", () => {
    expect(sanitizeStorageStemSegment("Hotboii & Lil Baby", 80)).toBe("hotboii_lil_baby");
    expect(sanitizeStorageStemSegment("Call Me (Clean)", 80)).toBe("call_me_clean");
  });
});

describe("packStorageObjectBasename", () => {
  function file(name: string, type: string): File {
    return new File([], name, { type });
  }

  it("uses slot_title_artist.ext when metadata is present", () => {
    expect(
      packStorageObjectBasename("radio_edit", file("ignored!!!.mp3", "audio/mpeg"), {
        title: "Call Me",
        credit_artist_name: "Chxrry",
      }),
    ).toBe("radio_edit_call_me_chxrry.mp3");
  });

  it("uses dirty slot for full version", () => {
    expect(
      packStorageObjectBasename("dirty_full", file("x.wav", "audio/wav"), {
        title: "Alicia",
        credit_artist_name: "Hotboii & Lil Baby",
      }),
    ).toBe("dirty_full_alicia_hotboii_lil_baby.wav");
  });

  it("falls back to safe original name when title or artist missing", () => {
    expect(
      packStorageObjectBasename("radio_edit", file("Weird Name (!).mp3", "audio/mpeg"), {
        title: "",
        credit_artist_name: "Solo",
      }),
    ).toMatch(/^radio_edit_/);
  });
});
