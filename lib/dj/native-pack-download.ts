/** True when Web Share was blocked or cancelled in this WebView context. */
export function isSharePermissionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return true;
  if (err.name === "NotAllowedError") return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("not allowed by the user agent") ||
    msg.includes("user denied permission") ||
    msg.includes("permission denied")
  );
}

export function sanitizePackFilename(name: string): string {
  const trimmed = name.trim() || "dj-pack.zip";
  return trimmed.replace(/[^\w.\- ()[\]]+/g, "_");
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read pack file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read pack file"));
    reader.readAsDataURL(blob);
  });
}

export function resolveSameOriginUrl(path: string): string {
  if (path.startsWith("http")) return path;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** iPhone/iPad Safari in the mobile browser (not Capacitor). */
export function isIosMobileBrowser(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
  maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
): boolean {
  if (!userAgent) return false;
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1;
}

/** Desktop or mobile Safari (not Chrome/Firefox wrappers). */
export function isSafariBrowser(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  if (!userAgent) return false;
  return (
    /Safari/i.test(userAgent) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS|DuckDuckGo/i.test(userAgent)
  );
}

/** Safari blocks programmatic downloads after async server work — show a real link tap. */
export function prefersManualPackDownloadLink(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
  maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
): boolean {
  return isSafariBrowser(userAgent) || isIosMobileBrowser(userAgent, platform, maxTouchPoints);
}
