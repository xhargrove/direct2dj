import { describe, expect, it } from "vitest";
import { normalizeYoutubeUrl, parseYoutubeUrlField } from "@/lib/tracks/youtube-url";

describe("normalizeYoutubeUrl", () => {
  it("accepts watch and youtu.be links", () => {
    expect(normalizeYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(normalizeYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("rejects non-YouTube URLs", () => {
    expect(normalizeYoutubeUrl("https://vimeo.com/123")).toBeNull();
  });
});

describe("parseYoutubeUrlField", () => {
  it("allows empty", () => {
    expect(parseYoutubeUrlField("  ")).toEqual({ ok: true, url: null });
  });
});
