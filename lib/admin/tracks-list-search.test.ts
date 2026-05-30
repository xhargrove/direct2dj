import { describe, expect, it } from "vitest";
import { buildAdminTracksSearchOrFilter, escapeIlikePattern } from "./tracks-list-search";

describe("escapeIlikePattern", () => {
  it("escapes ilike wildcards", () => {
    expect(escapeIlikePattern("100%_done")).toBe("100\\%\\_done");
  });
});

describe("buildAdminTracksSearchOrFilter", () => {
  it("returns null for blank query", () => {
    expect(buildAdminTracksSearchOrFilter("   ")).toBeNull();
  });

  it("searches title and credit artist name", () => {
    expect(buildAdminTracksSearchOrFilter("midnight")).toBe(
      "title.ilike.%midnight%,credit_artist_name.ilike.%midnight%",
    );
  });

  it("includes exact id match for uuid queries", () => {
    const id = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    expect(buildAdminTracksSearchOrFilter(id)).toContain(`id.eq.${id}`);
  });

  it("includes artist id matches", () => {
    const artistId = "11111111-2222-4333-8444-555555555555";
    expect(buildAdminTracksSearchOrFilter("nova", [artistId])).toContain(
      `artist_id.in.(${artistId})`,
    );
  });
});
