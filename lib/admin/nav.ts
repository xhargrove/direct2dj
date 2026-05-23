export type AdminNavItem = { href: string; label: string };

export const fullAdminNav: readonly AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/tracks/new", label: "New DJ pack" },
  { href: "/admin/spotlights", label: "Spotlights" },
  { href: "/admin/featured", label: "Featured" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/djs", label: "DJs" },
  { href: "/admin/communications", label: "DJ messages" },
  { href: "/admin/dj-activity", label: "DJ activity" },
  { href: "/admin/dj-applications", label: "DJ applications" },
  { href: "/admin/dj-organizations", label: "DJ organizations" },
  { href: "/admin/play-reports", label: "Play reports" },
  { href: "/admin/system", label: "System" },
];

export const coAdminNav: readonly AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/tracks/new", label: "New DJ pack" },
];

/** Longest-prefix match so `/admin/tracks/new` highlights New DJ pack, not Tracks. */
export function activeAdminNavHref(pathname: string, items: readonly AdminNavItem[]): string | null {
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.href;
    }
  }
  return null;
}
