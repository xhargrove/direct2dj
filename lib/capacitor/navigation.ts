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
  const msg = message.toLowerCase();
  return msg.includes("frame load interrupted") || msg.includes("nsurlerrordomain error -999");
}

export function isChunkLoadError(message: string, name = ""): boolean {
  if (name === "ChunkLoadError") return true;
  const msg = message.toLowerCase();
  return msg.includes("failed to load chunk") || msg.includes("loading chunk") || msg.includes("chunkloaderror");
}

export function isRecoverableNativeShellError(reason: unknown): boolean {
  const { message, name } = errorReasonParts(reason);
  if (isInterruptedNavigationMessage(message)) return false;
  if (isChunkLoadError(message, name)) return true;
  return isLoadFailedMessage(message);
}

function errorReasonParts(reason: unknown): { message: string; name: string } {
  if (reason instanceof Error) return { message: reason.message, name: reason.name };
  if (typeof reason === "string") return { message: reason, name: "" };
  if (reason && typeof reason === "object") {
    const record = reason as { message?: unknown; name?: unknown };
    return {
      message: typeof record.message === "string" ? record.message : "",
      name: typeof record.name === "string" ? record.name : "",
    };
  }
  return { message: "", name: "" };
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

/** Force a full document reload (needed when Next.js chunks mismatch after deploy). */
export function hardReloadPage(options?: { force?: boolean }): boolean {
  if (typeof window === "undefined" || !isNativeAppShell()) return false;

  const path = window.location.pathname + window.location.search;
  const key = nativeReloadKey(path);
  if (!options?.force && sessionStorage.getItem(key) === "1") return false;

  sessionStorage.setItem(key, "1");
  navigateInFlight = true;
  window.location.reload();
  return true;
}

/** User-initiated reload — bypass throttle and bust stale WKWebView cache when needed. */
export function forceHardReloadPage(): void {
  if (typeof window === "undefined") return;

  clearNativeLoadFailedRecoveryFlag();
  navigateInFlight = true;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_dsp_reload", String(Date.now()));
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    return;
  } catch {
    window.location.reload();
  }
}

/** One automatic recovery per path when WKWebView fetch/chunk loading fails. */
export function tryNativeShellRecovery(reason?: unknown): boolean {
  if (typeof window === "undefined" || !isNativeAppShell()) return false;
  if (navigateInFlight) return false;

  const { message, name } = errorReasonParts(reason);
  if (reason !== undefined && !isRecoverableNativeShellError(reason)) return false;

  if (isChunkLoadError(message, name)) {
    return hardReloadPage();
  }

  return tryNativeLoadFailedRecovery();
}

/** One automatic full reload per path when WKWebView RSC fetch fails. */
export function tryNativeLoadFailedRecovery(): boolean {
  if (typeof window === "undefined" || !isNativeAppShell()) return false;
  if (navigateInFlight) return false;

  const path = window.location.pathname + window.location.search;
  const key = nativeReloadKey(path);
  if (sessionStorage.getItem(key) === "1") return false;

  sessionStorage.setItem(key, "1");
  hardReloadPage();
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
