import { describe, expect, it } from "vitest";
import { isIosMobileBrowser, isSafariBrowser, isSharePermissionError, prefersManualPackDownloadLink, sanitizePackFilename } from "./native-pack-download";

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

describe("isIosMobileBrowser", () => {
  it("detects iPhone Safari", () => {
    expect(
      isIosMobileBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });

  it("detects iPadOS desktop UA", () => {
    expect(isIosMobileBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe(true);
  });

  it("ignores desktop Safari on Mac", () => {
    expect(
      isIosMobileBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        "MacIntel",
        0,
      ),
    ).toBe(false);
  });
});

describe("isSafariBrowser", () => {
  it("detects desktop Safari", () => {
    expect(
      isSafariBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      ),
    ).toBe(true);
  });

  it("ignores Chrome", () => {
    expect(
      isSafariBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("prefersManualPackDownloadLink", () => {
  it("is true for iPhone Safari", () => {
    expect(
      prefersManualPackDownloadLink(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });
});
