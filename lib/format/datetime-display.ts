/**
 * Fixed locale + timezone so SSR (Node) and client (browser) output match.
 * Without `timeZone`, Node defaults to UTC while browsers use local TZ → React #418.
 */

export const APP_DISPLAY_TIME_ZONE = "America/New_York";

export const DISPLAY_DATETIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: APP_DISPLAY_TIME_ZONE,
};

export const DISPLAY_DATE: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: APP_DISPLAY_TIME_ZONE,
};

export function formatDateTimeDisplay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", DISPLAY_DATETIME);
}

export function formatDateDisplay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", DISPLAY_DATE);
}
