/**
 * Fixed locale + options so SSR and client output match (default locale differs Node vs browser).
 */

export const DISPLAY_DATETIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

export const DISPLAY_DATE: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

export function formatDateTimeDisplay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", DISPLAY_DATETIME);
}

export function formatDateDisplay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", DISPLAY_DATE);
}
