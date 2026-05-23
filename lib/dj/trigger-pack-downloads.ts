"use client";

/** Starts a single browser download for the pack ZIP (same-origin API route). */
export function triggerPackZipDownload(zipUrl: string): void {
  const a = document.createElement("a");
  a.href = zipUrl;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
