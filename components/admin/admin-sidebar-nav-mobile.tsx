"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeAdminNavHref, type AdminNavItem } from "@/lib/admin/nav";

/** Horizontal scroll strip for small viewports. */
export function AdminSidebarNavMobile({ items }: { items: readonly AdminNavItem[] }) {
  const pathname = usePathname() ?? "";
  const activeHref = activeAdminNavHref(pathname, items);

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-t border-white/7 px-3 py-2 lg:hidden"
      aria-label="Backstage"
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-white/10 text-sky-200"
                : "text-zinc-300 hover:bg-white/5 hover:text-sky-100"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
