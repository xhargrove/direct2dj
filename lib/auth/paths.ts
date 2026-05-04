import type { UserRole } from "@/lib/types/roles";

const ROLE_HOME: Record<UserRole, string> = {
  artist: "/artist",
  dj: "/dj",
  admin: "/admin",
};

export function dashboardPathForRole(role: UserRole): string {
  return ROLE_HOME[role];
}

/** Limits open redirects after login to same-origin app paths. */
export function safeAppPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  if (next.includes("?") || next.includes("#")) {
    return fallback;
  }
  return next;
}
