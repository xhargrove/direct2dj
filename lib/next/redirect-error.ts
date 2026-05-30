export function isNextRedirectError(error: Error & { digest?: string }): boolean {
  return error.digest?.startsWith("NEXT_REDIRECT") ?? false;
}

/** Parse Next.js redirect digest, e.g. `NEXT_REDIRECT;replace;/login;307;`. */
export function redirectTargetFromDigest(digest: string): string | null {
  const parts = digest.split(";");
  if (parts[0] !== "NEXT_REDIRECT" || parts.length < 3) return null;
  const target = parts[2]?.trim();
  return target || null;
}
