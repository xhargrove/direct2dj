"use client";

import { Capacitor } from "@capacitor/core";
import { isNativeAppShell } from "@/lib/capacitor/navigation";
import { filenameFromContentDisposition } from "@/lib/dj/content-disposition-filename";
import {
  blobToBase64,
  resolveSameOriginUrl,
  sanitizePackFilename,
} from "@/lib/dj/native-pack-download";

export type TriggerPackDownloadResult = {
  error?: string;
  /** Pack was offered via the iOS/Android share sheet (save to Files). */
  nativeShare?: boolean;
  /** Fell back to opening the pack URL in the WebView download flow. */
  directDownload?: boolean;
};

async function shareZipViaCapacitorPlugins(blob: Blob, name: string): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const path = sanitizePackFilename(name);
  const data = await blobToBase64(blob);
  await Filesystem.writeFile({ path, data, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });
  await Share.share({ url: uri, title: path });
}

async function shareZipViaWebShare(file: File, name: string): Promise<void> {
  if (typeof navigator.share !== "function" || !navigator.canShare?.({ files: [file] })) {
    throw new Error("Web Share unavailable");
  }
  await navigator.share({ files: [file], title: name });
}

function triggerDirectPackDownload(zipUrl: string): void {
  window.location.assign(resolveSameOriginUrl(zipUrl));
}

async function deliverNativePackZip(blob: Blob, name: string, zipUrl: string): Promise<TriggerPackDownloadResult> {
  const file = new File([blob], name, { type: blob.type || "application/zip" });

  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Share") && Capacitor.isPluginAvailable("Filesystem")) {
    try {
      await shareZipViaCapacitorPlugins(blob, name);
      return { nativeShare: true };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return {};
    }
  }

  try {
    await shareZipViaWebShare(file, name);
    return { nativeShare: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return {};
  }

  triggerDirectPackDownload(zipUrl);
  return { directDownload: true };
}

/** Starts a pack ZIP download — desktop browser or native share sheet on mobile. */
export async function triggerPackZipDownload(zipUrl: string): Promise<TriggerPackDownloadResult> {
  if (!isNativeAppShell()) {
    const a = document.createElement("a");
    a.href = zipUrl;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return {};
  }

  try {
    const res = await fetch(zipUrl, { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: body?.error ?? `Download failed (${res.status})` };
    }

    const blob = await res.blob();
    const name =
      filenameFromContentDisposition(res.headers.get("Content-Disposition")) ?? "dj-pack.zip";

    return deliverNativePackZip(blob, name, zipUrl);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {};
    }
    return { error: err instanceof Error ? err.message : "Download failed" };
  }
}
