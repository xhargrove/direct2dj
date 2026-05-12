import Link from "next/link";
import type { ReactNode } from "react";
import { requireRoles } from "@/lib/auth/require-role";
import { AppTopNav } from "@/components/shell/app-top-nav";

export default async function LabelLayout({ children }: { children: ReactNode }) {
  await requireRoles(["label_rep"]);

  const nav = (
    <>
      <Link href="/label/dashboard" className="dj-nav-link underline-offset-4 hover:underline">
        Dashboard
      </Link>
      <Link href="/label/roster" className="dj-nav-link underline-offset-4 hover:underline">
        Roster
      </Link>
      <Link href="/label/catalog" className="dj-nav-link underline-offset-4 hover:underline">
        Site catalog
      </Link>
    </>
  );

  const trailing = (
    <form action="/auth/sign-out" method="post">
      <button type="submit" className="dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline">
        Sign out
      </button>
    </form>
  );

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8">
      <AppTopNav kicker="Label desk" nav={nav} trailing={trailing} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
