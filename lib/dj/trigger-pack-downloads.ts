"use client";

import { isNativeAppShell } from "@/lib/capacitor/navigation";
import { filenameFromContentDisposition } from "@/lib/dj/content-disposition-filename";

export type TriggerPackDownloadResult = {
  error?: string;
  /** Pack was offered via the iOS/Android share sheet (save to Files). */
  nativeShare?: boolean;
};

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
    const file = new File([blob], name, { type: blob.type || "application/zip" });

    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return { nativeShare: true };
    }

    return {
      error:
        "Your iPhone could not open the share sheet for this ZIP. Try the same track in Safari, or update the app after the next release.",
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {};
    }
    return { error: err instanceof Error ? err.message : "Download failed" };
  }
}
