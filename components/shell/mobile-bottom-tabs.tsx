"use client";

import { usePathname } from "next/navigation";
import { ShellLink } from "@/components/capacitor/shell-link";
import type { ShellTab } from "@/lib/platform/shell-mode";
import { isTabActive } from "@/lib/platform/shell-mode";

export function MobileBottomTabs({ tabs }: { tabs: readonly ShellTab[] }) {
  const pathname = usePathname() ?? "";

  if (tabs.length === 0) return null;

  return (
    <nav
      className="shell-mobile mobile-shell-tabs fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(8,6,18,0.96)] backdrop-blur-xl"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <ShellLink
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium leading-none transition-colors ${
                active ? "text-cyan-300" : "text-zinc-500 hover:text-zinc-300"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="truncate">{tab.label}</span>
            </ShellLink>
          );
        })}
      </div>
    </nav>
  );
}
