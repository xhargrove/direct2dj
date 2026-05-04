"use client";

import type { PackDownloadFile } from "@/app/dj/actions";

const STAGGER_MS = 200;

function clickDownloadLink(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Starts browser downloads for each pack file. Tries fetch→blob first (good filenames
 * cross-origin); on network/CORS failure falls back to opening the signed URL (browser may
 * stream or open a tab instead of saving — avoids throwing).
 */
export async function triggerPackDownloads(files: PackDownloadFile[]): Promise<void> {
  await Promise.all(
    files.map(
      (f, i) =>
        new Promise<void>((resolve) => {
          window.setTimeout(() => {
            void (async () => {
              try {
                const res = await fetch(f.signedUrl);
                if (!res.ok) throw new Error(String(res.status));
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                try {
                  clickDownloadLink(url, f.filename);
                } finally {
                  URL.revokeObjectURL(url);
                }
              } catch {
                try {
                  clickDownloadLink(f.signedUrl, f.filename);
                } catch {
                  try {
                    window.open(f.signedUrl, "_blank", "noopener,noreferrer");
                  } catch {
                    /* last resort — swallow to avoid Next overlay TypeError */
                  }
                }
              }
              resolve();
            })();
          }, i * STAGGER_MS);
        }),
    ),
  );
}
