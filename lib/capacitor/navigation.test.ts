import { describe, expect, it, vi } from "vitest";
import {
  forceHardReloadPage,
  isChunkLoadError,
  isInterruptedNavigationMessage,
  isLoadFailedMessage,
  isRecoverableNativeShellError,
} from "./navigation";

describe("isLoadFailedMessage", () => {
  it("detects WKWebView load failures", () => {
    expect(isLoadFailedMessage("Load failed")).toBe(true);
    expect(isLoadFailedMessage("Failed to fetch RSC payload")).toBe(true);
    expect(isLoadFailedMessage("NetworkError when attempting to fetch resource.")).toBe(true);
  });

  it("ignores interrupted navigations and unrelated errors", () => {
    expect(isLoadFailedMessage("Frame load interrupted")).toBe(false);
    expect(isLoadFailedMessage("Invalid login credentials")).toBe(false);
  });
});

describe("isInterruptedNavigationMessage", () => {
  it("detects benign WebKit interruption logs", () => {
    expect(isInterruptedNavigationMessage("Frame load interrupted")).toBe(true);
    expect(isInterruptedNavigationMessage("The operation couldn’t be completed. (NSURLErrorDomain error -999.)")).toBe(
      true,
    );
  });
});

describe("isChunkLoadError", () => {
  it("detects stale Next.js chunk failures", () => {
    expect(isChunkLoadError("Failed to load chunk /_next/static/chunks/foo.js", "ChunkLoadError")).toBe(true);
    expect(isChunkLoadError("Loading chunk 123 failed.", "")).toBe(true);
  });
});

describe("isRecoverableNativeShellError", () => {
  it("treats chunk errors as recoverable", () => {
    expect(isRecoverableNativeShellError(new Error("Failed to load chunk abc"))).toBe(true);
  });

  it("ignores cancelled navigations", () => {
    expect(isRecoverableNativeShellError(new Error("NSURLErrorDomain error -999"))).toBe(false);
  });
});

describe("forceHardReloadPage", () => {
  it("replaces location with a cache-bust query param", () => {
    vi.stubGlobal("window", {
      location: {
        href: "https://digitalservicepack.com/dj/feed",
        pathname: "/dj/feed",
        search: "",
        hash: "",
        replace: vi.fn(),
        reload: vi.fn(),
      },
    });
    vi.stubGlobal("sessionStorage", {
      removeItem: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
    });

    forceHardReloadPage();

    expect(window.location.replace).toHaveBeenCalledWith(
      expect.stringContaining("/dj/feed?_dsp_reload="),
    );
    vi.unstubAllGlobals();
  });
});
