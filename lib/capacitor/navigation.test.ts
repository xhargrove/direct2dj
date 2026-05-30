import { describe, expect, it } from "vitest";
import { isInterruptedNavigationMessage, isLoadFailedMessage } from "./navigation";

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
  });
});
