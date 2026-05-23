import type { UserRole } from "@/lib/types/roles";

export const BACKSTAGE_ROLES = ["admin", "co_admin"] as const satisfies readonly UserRole[];

export type BackstageRole = (typeof BACKSTAGE_ROLES)[number];

export function isBackstageRole(role: UserRole): role is BackstageRole {
  return role === "admin" || role === "co_admin";
}

export function isFullAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export function isCoAdminRole(role: UserRole): boolean {
  return role === "co_admin";
}

const CO_ADMIN_ALLOWED_EXACT = new Set([
  "/admin",
  "/admin/dashboard",
  "/admin/tracks",
  "/admin/tracks/new",
]);

const TRACK_ID_RE =
  /^\/admin\/tracks\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Paths a co-admin may open in Backstage (upload + pack QA only). */
export function isCoAdminUploadPath(pathname: string): boolean {
  if (CO_ADMIN_ALLOWED_EXACT.has(pathname)) return true;
  if (TRACK_ID_RE.test(pathname)) return true;
  return false;
}

export function coAdminRedirectPath(pathname: string): string | null {
  if (!pathname.startsWith("/admin")) return null;
  if (isCoAdminUploadPath(pathname)) return null;
  return "/admin/tracks";
}
