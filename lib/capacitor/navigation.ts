import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function isNativeAppShell(): boolean {
  return Capacitor.isNativePlatform();
}

/** Full page load — required after auth in WKWebView so cookies + RSC requests stay in sync. */
export function hardNavigate(path: string): void {
  if (typeof window === "undefined") return;
  const target = path.startsWith("http")
    ? path
    : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  window.location.assign(target);
}

/**
 * Stripe and other third-party checkout flows interrupt the main WKWebView frame if loaded inline.
 * On native, open an in-app browser tab; on web, use a normal redirect.
 */
export async function openExternalFlowUrl(url: string): Promise<void> {
  if (isNativeAppShell()) {
    await Browser.open({ url, presentationStyle: "fullscreen" });
    return;
  }
  window.location.assign(url);
}
