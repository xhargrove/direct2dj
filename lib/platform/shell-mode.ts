/** Matches `components/platform/shell-mode-script.tsx` — set before React hydrates in the native WebView. */
export type ShellMode = "web" | "native";

export function readShellModeFromDocument(): ShellMode {
  if (typeof document === "undefined") return "web";
  return document.documentElement.dataset.shell === "native" ? "native" : "web";
}

export type ShellNavLink = { href: string; label: string };

export type ShellTab = {
  href: string;
  label: string;
  /** Path prefixes that mark this tab active (defaults to `[href]`). */
  match?: string[];
};

export function isTabActive(pathname: string, tab: ShellTab): boolean {
  const prefixes = tab.match ?? [tab.href];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
