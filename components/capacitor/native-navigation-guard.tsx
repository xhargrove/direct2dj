"use client";

import { useEffect } from "react";
import {
  clearNativeLoadFailedRecoveryFlag,
  hardNavigate,
  hardReloadPage,
  isChunkLoadError,
  isLoadFailedMessage,
  isNativeAppShell,
  isRecoverableNativeShellError,
  markNativeNavigationComplete,
  NATIVE_LINK_ATTR,
  tryNativeShellRecovery,
} from "@/lib/capacitor/navigation";

/**
 * Next.js client navigations (RSC fetch) often fail in WKWebView with "Load failed".
 * In the native shell, same-origin link clicks use a full document load instead.
 */
export function NativeNavigationGuard() {
  useEffect(() => {
    if (!isNativeAppShell()) return;

    clearNativeLoadFailedRecoveryFlag();

    const onLoad = () => {
      markNativeNavigationComplete();
      clearNativeLoadFailedRecoveryFlag();
    };
    window.addEventListener("load", onLoad);

    let recoveryTimer: number | undefined;
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isRecoverableNativeShellError(event.reason)) return;

      window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(() => {
        tryNativeShellRecovery(event.reason);
      }, 400);
    };
    window.addEventListener("unhandledrejection", onRejection);

    const onError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      const name = event.error instanceof Error ? event.error.name : "";
      if (!isRecoverableNativeShellError({ message, name })) return;

      window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(() => {
        tryNativeShellRecovery({ message, name });
      }, 400);
    };
    window.addEventListener("error", onError);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.hasAttribute(NATIVE_LINK_ATTR)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      hardNavigate(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      window.clearTimeout(recoveryTimer);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
