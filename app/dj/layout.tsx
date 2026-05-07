import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { requireRoles } from "@/lib/auth/require-role";
import { getAdminWorkspaceTestBannerState } from "@/lib/auth/admin-workspace-test-banner-state";
import { AdminWorkspaceTestBanner } from "@/components/admin/admin-workspace-test-banner";
import { DjWorkspaceGateBanner } from "@/components/dj/dj-workspace-gate-banner";
import { NotificationBell } from "@/components/notifications/notification-bell";
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

  return (
    <div className="flex min-h-full flex-col">
      {workspaceBanner.show ? <AdminWorkspaceTestBanner role={workspaceBanner.role} /> : null}
      <header className="dj-header flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/site-logo.png"
            alt="Digital Service Pack logo"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-md"
            priority
          />
          <div className="flex flex-col gap-0.5">
            <span className="dj-brand text-sm font-semibold leading-none tracking-tight">Digital Service Pack</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">DJ deck</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="dj-nav-link underline-offset-4 hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
          <NotificationBell initialUnread={unread} />
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
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
