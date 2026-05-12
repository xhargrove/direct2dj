import type { ReactNode } from "react";
import Link from "next/link";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { requireRoles } from "@/lib/auth/require-role";
import { getAdminWorkspaceTestBannerState } from "@/lib/auth/admin-workspace-test-banner-state";
import { AdminWorkspaceTestBanner } from "@/components/admin/admin-workspace-test-banner";
import { DjWorkspaceGateBanner } from "@/components/dj/dj-workspace-gate-banner";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AppTopNav } from "@/components/shell/app-top-nav";
import { createClient } from "@/lib/supabase/server";
import type { DjVettingStatus } from "@/lib/types/database";

const promoNav = [
  { href: "/dj/dashboard", label: "Dashboard" },
  { href: "/dj/profile", label: "Profile" },
  { href: "/dj/feed", label: "Feed" },
  { href: "/dj/downloads", label: "Downloads" },
  { href: "/dj/play-reports", label: "Play reports" },
  { href: "/dj/history", label: "History" },
  { href: "/dj/settings", label: "Privacy" },
] as const;

export default async function DjLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["dj"]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navItems: readonly { href: string; label: string }[] = promoNav;
  let gateBanner: ReactNode = null;

  const unread = user ? await getUnreadNotificationCount() : 0;

  if (user) {
    const { data: dj } = await supabase.from("djs").select("id, vetting_status").eq("profile_id", user.id).maybeSingle();
    const status = dj?.vetting_status;
    if (status !== "approved") {
      const gated: { href: string; label: string }[] = [
        { href: "/dj/dashboard", label: "Dashboard" },
        { href: "/dj/application-status", label: "Status" },
        { href: "/dj/profile", label: "Profile" },
        { href: "/dj/settings", label: "Privacy" },
      ];
      if (status !== "suspended") {
        gated.splice(2, 0, { href: "/dj/apply", label: "Apply" });
      }
      navItems = gated;
    }

    if (dj && status && status !== "approved") {
      const { data: appRow } = await supabase.from("dj_applications").select("dj_id").eq("dj_id", dj.id).maybeSingle();
      gateBanner = (
        <DjWorkspaceGateBanner
          vettingStatus={status as DjVettingStatus}
          hasSubmittedApplication={!!appRow}
        />
      );
    }
  }

  const workspaceBanner = await getAdminWorkspaceTestBannerState();

  const nav = (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="dj-nav-link underline-offset-4 hover:underline">
          {item.label}
        </Link>
      ))}
    </>
  );

  const trailing = (
    <>
      <NotificationBell initialUnread={unread} />
      <form action="/auth/sign-out" method="post">
        <button type="submit" className="dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline">
          Sign out
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-full flex-col">
      {workspaceBanner.show ? <AdminWorkspaceTestBanner role={workspaceBanner.role} /> : null}
      <AppTopNav kicker="DJ deck" nav={nav} trailing={trailing} />
      {gateBanner}
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
