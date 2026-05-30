import { describe, expect, it } from "vitest";
import { filenameFromContentDisposition } from "./content-disposition-filename";

describe("filenameFromContentDisposition", () => {
  it("parses UTF-8 filename*", () => {
    expect(
      filenameFromContentDisposition(
        "attachment; filename=\"pack.zip\"; filename*=UTF-8''Artist%20-%20Track.zip",
      ),
    ).toBe("Artist - Track.zip");
  });

  it("parses quoted filename", () => {
    expect(filenameFromContentDisposition('attachment; filename="my-pack.zip"')).toBe("my-pack.zip");
  });
});
