"use client";

import { Capacitor } from "@capacitor/core";
import { isNativeAppShell } from "@/lib/capacitor/navigation";
import { filenameFromContentDisposition } from "@/lib/dj/content-disposition-filename";
import {
  blobToBase64,
  isSafariBrowser,
  prefersManualPackDownloadLink,
  resolveSameOriginUrl,
  sanitizePackFilename,
} from "@/lib/dj/native-pack-download";

export type TriggerPackDownloadResult = {
  error?: string;
  /** Pack was offered via the iOS/Android share sheet (save to Files). */
  nativeShare?: boolean;
  /** Fell back to opening the pack URL in the browser download flow. */
  directDownload?: boolean;
  /** Safari needs a user-tapped link after async prepare — skip auto delivery. */
  manualLink?: boolean;
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

function triggerHiddenFrameDownload(zipUrl: string): void {
  const url = resolveSameOriginUrl(zipUrl);
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 120_000);
}

function triggerBlobDownload(blob: Blob, name: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function fetchPackBlob(zipUrl: string): Promise<{ blob: Blob; name: string } | { error: string }> {
  const url = resolveSameOriginUrl(zipUrl);
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { error: body?.error ?? `Download failed (${res.status})` };
  }

  const blob = await res.blob();
  const name = filenameFromContentDisposition(res.headers.get("Content-Disposition")) ?? "dj-pack.zip";
  return { blob, name };
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

async function deliverWebPackZip(blob: Blob, name: string, zipUrl: string): Promise<TriggerPackDownloadResult> {
  if (isSafariBrowser()) {
    triggerHiddenFrameDownload(zipUrl);
    return { directDownload: true };
  }

  try {
    triggerBlobDownload(blob, name);
    return {};
  } catch {
    triggerHiddenFrameDownload(zipUrl);
    return { directDownload: true };
  }
}

export function shouldOfferManualPackDownloadLink(): boolean {
  return !isNativeAppShell() && prefersManualPackDownloadLink();
}

/** Starts a pack ZIP download — desktop browser or native share sheet on mobile. */
export async function triggerPackZipDownload(zipUrl: string): Promise<TriggerPackDownloadResult> {
  if (shouldOfferManualPackDownloadLink()) {
    return { manualLink: true };
  }

  try {
    const fetched = await fetchPackBlob(zipUrl);
    if ("error" in fetched) return { error: fetched.error };

    if (isNativeAppShell()) {
      return deliverNativePackZip(fetched.blob, fetched.name, zipUrl);
    }

    return deliverWebPackZip(fetched.blob, fetched.name, zipUrl);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {};
    }

    if (!isNativeAppShell()) {
      triggerHiddenFrameDownload(zipUrl);
      return { directDownload: true };
    }

    return { error: err instanceof Error ? err.message : "Download failed" };
  }
}
