import Link from "next/link";
import type { ReactNode } from "react";
import { requireRoles } from "@/lib/auth/require-role";

export default async function LabelLayout({ children }: { children: ReactNode }) {
  await requireRoles(["label_rep"]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Label representative</p>
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/label/dashboard" className="underline underline-offset-4">
            Dashboard
          </Link>
          <Link href="/label/roster" className="underline underline-offset-4">
            Roster
          </Link>
          <Link href="/label/catalog" className="underline underline-offset-4">
            Site catalog
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
