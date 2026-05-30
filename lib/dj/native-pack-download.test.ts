import { describe, expect, it } from "vitest";
import { isSharePermissionError, sanitizePackFilename } from "./native-pack-download";

describe("isSharePermissionError", () => {
  it("detects WKWebView share permission failures", () => {
    expect(
      isSharePermissionError(
        new Error(
          "The request is not allowed by the user agent or the platform in the current context, because the user denied permission.",
        ),
      ),
    ).toBe(true);
    expect(isSharePermissionError(new DOMException("denied", "NotAllowedError"))).toBe(true);
  });

  it("treats user cancel as permission flow", () => {
    const err = new Error("Share canceled");
    err.name = "AbortError";
    expect(isSharePermissionError(err)).toBe(true);
  });
});

describe("sanitizePackFilename", () => {
  it("keeps readable zip names", () => {
    expect(sanitizePackFilename("Artist - Track.zip")).toBe("Artist - Track.zip");
  });
});
