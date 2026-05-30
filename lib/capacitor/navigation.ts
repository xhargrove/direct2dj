import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export const NATIVE_LINK_ATTR = "data-dsp-native-link";

export function isNativeAppShell(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* bridge not ready */
  }
  return /Capacitor/i.test(navigator.userAgent);
}

export function isLoadFailedMessage(message: string): boolean {
  const msg = message.toLowerCase();
  if (isInterruptedNavigationMessage(message)) return false;
  return msg.includes("load failed") || msg.includes("failed to fetch") || msg.includes("networkerror");
}

/** Benign WKWebView log when a new navigation cancels an in-flight load. */
export function isInterruptedNavigationMessage(message: string): boolean {
  return message.toLowerCase().includes("frame load interrupted");
}

const nativeReloadKey = (path: string) => `dsp:native-reload:${path}`;

let navigateInFlight = false;
let lastNavigateTarget = "";
let lastNavigateAt = 0;

function resolveNavigateTarget(path: string): string {
  if (path.startsWith("http")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function sameDocumentLocation(path: string): boolean {
  try {
    const target = new URL(resolveNavigateTarget(path));
    const current = new URL(window.location.href);
    return (
      target.origin === current.origin &&
      target.pathname === current.pathname &&
      target.search === current.search &&
      target.hash === current.hash
    );
  } catch {
    return false;
  }
}

export function markNativeNavigationComplete(): void {
  navigateInFlight = false;
}

/** Full page load — required after auth in WKWebView so cookies + RSC requests stay in sync. */
export function hardNavigate(path: string): void {
  if (typeof window === "undefined") return;
  if (sameDocumentLocation(path)) return;

  const target = resolveNavigateTarget(path);
  const now = Date.now();
  if (navigateInFlight && target === lastNavigateTarget && now - lastNavigateAt < 2000) return;

  navigateInFlight = true;
  lastNavigateTarget = target;
  lastNavigateAt = now;
  window.location.assign(target);
}

/** One automatic full reload per path when WKWebView RSC fetch fails. */
export function tryNativeLoadFailedRecovery(): boolean {
  if (typeof window === "undefined" || !isNativeAppShell()) return false;
  if (navigateInFlight) return false;

  const path = window.location.pathname + window.location.search;
  const key = nativeReloadKey(path);
  if (sessionStorage.getItem(key) === "1") return false;

  sessionStorage.setItem(key, "1");
  hardNavigate(path);
  return true;
}

export function clearNativeLoadFailedRecoveryFlag(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname + window.location.search;
  sessionStorage.removeItem(nativeReloadKey(path));
  markNativeNavigationComplete();
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
