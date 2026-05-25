/** Normalize a site URL env value (adds https:// when missing). Safe for server and metadata. */
export function normalizePublicSiteUrl(
  raw: string | undefined | null,
  fallback = "https://direct2dj.vercel.app",
): string {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback.replace(/\/$/, "");
  const withScheme =
    trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/$/, "");
}

export function getPublicSiteUrl(): string {
  const vercel = process.env.VERCEL_URL?.trim();
  const fallback = vercel ? `https://${vercel.replace(/^https?:\/\//, "")}` : "https://direct2dj.vercel.app";
  return normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, fallback);
}

export function getMetadataBaseUrl(): URL {
  return new URL(getPublicSiteUrl());
}
