import Link from "next/link";
import type { ReactNode } from "react";
import { requireRoles } from "@/lib/auth/require-role";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { LABEL_MOBILE_TABS } from "@/lib/platform/mobile-tabs";

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

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8">
      <WorkspaceChrome
        kicker="Label desk"
        nav={nav}
        mobileTabs={LABEL_MOBILE_TABS}
        initialUnread={0}
        showNotifications={false}
      />
      <div className="mobile-shell-main mt-6">{children}</div>
    </div>
  );
}
