import type { ShellTab } from "@/lib/platform/shell-mode";

export const DJ_MOBILE_TABS_APPROVED: readonly ShellTab[] = [
  { href: "/dj/dashboard", label: "Dashboard" },
  { href: "/dj/feed", label: "Feed", match: ["/dj/feed", "/dj/tracks"] },
  { href: "/dj/downloads", label: "Downloads" },
  { href: "/dj/more", label: "More", match: ["/dj/more", "/dj/profile", "/dj/settings", "/dj/play-reports", "/dj/history", "/dj/apply", "/dj/application-status"] },
];

export const DJ_MOBILE_TABS_LIMITED: readonly ShellTab[] = [
  { href: "/dj/dashboard", label: "Dashboard" },
  { href: "/dj/application-status", label: "Status", match: ["/dj/application-status", "/dj/apply"] },
  { href: "/dj/profile", label: "Profile", match: ["/dj/profile"] },
  { href: "/dj/more", label: "More", match: ["/dj/more", "/dj/settings"] },
];

export const ARTIST_MOBILE_TABS: readonly ShellTab[] = [
  { href: "/artist/dashboard", label: "Dashboard" },
  { href: "/artist/tracks", label: "Tracks", match: ["/artist/tracks"] },
  { href: "/artist/tracks/new", label: "New" },
  { href: "/artist/more", label: "More", match: ["/artist/more", "/artist/analytics", "/artist/play-reports", "/artist/promote", "/artist/billing"] },
];

export const LABEL_MOBILE_TABS: readonly ShellTab[] = [
  { href: "/label/dashboard", label: "Dashboard" },
  { href: "/label/roster", label: "Roster" },
  { href: "/label/catalog", label: "Catalog" },
  { href: "/label/more", label: "More", match: ["/label/more"] },
];
