"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeAdminNavHref, type AdminNavItem } from "@/lib/admin/nav";

export function AdminSidebarNav({ items }: { items: readonly AdminNavItem[] }) {
  const pathname = usePathname() ?? "";
  const activeHref = activeAdminNavHref(pathname, items);

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-2 lg:py-3" aria-label="Backstage">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
