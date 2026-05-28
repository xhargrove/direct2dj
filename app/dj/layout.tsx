import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { AccountAccessGate } from "@/components/auth/account-access-gate";
import { getAdminWorkspaceTestBannerState } from "@/lib/auth/admin-workspace-test-banner-state";
import { isDjWorkspaceShellBlocked } from "@/lib/auth/account-access-state";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { resolveDjWorkspaceAccess } from "@/lib/auth/resolve-dj-workspace-access";
import { AdminWorkspaceTestBanner } from "@/components/admin/admin-workspace-test-banner";
import { DjWorkspaceGateBanner } from "@/components/dj/dj-workspace-gate-banner";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { DJ_MOBILE_TABS_APPROVED, DJ_MOBILE_TABS_LIMITED } from "@/lib/platform/mobile-tabs";
import { isUserRole } from "@/lib/types/roles";

const promoNav = [
  { href: "/dj/dashboard", label: "Dashboard" },
  { href: "/dj/profile", label: "Profile" },
  { href: "/dj/feed", label: "Feed" },
  { href: "/dj/downloads", label: "Downloads" },
  { href: "/dj/play-reports", label: "Play reports" },
  { href: "/dj/history", label: "History" },
  { href: "/dj/settings", label: "Privacy" },
] as const;

const LIMITED_DJ_NAV = [
  { href: "/dj/dashboard", label: "Dashboard" },
  { href: "/dj/application-status", label: "Status" },
  { href: "/dj/profile", label: "Profile" },
  { href: "/dj/settings", label: "Privacy" },
] as const;

export default async function DjLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await resolveDjWorkspaceAccess();

  if (access.state === "SIGNED_OUT") {
    redirect("/login");
  }

  if (access.profile && !["dj", "artist"].includes(access.profile.role)) {
    const next = isUserRole(access.profile.role)
      ? dashboardPathForRole(access.profile.role)
      : "/login";
    redirect(next);
  }

  const shellBlocked = isDjWorkspaceShellBlocked(access.state, access.dj);
  const unread = access.userId ? await getUnreadNotificationCount() : 0;

  let navItems: readonly { href: string; label: string }[] = promoNav;
  let gateBanner: ReactNode = null;

  if (access.profile?.role === "dj" && access.state !== "DJ_APPROVED" && !shellBlocked) {
    const isSuspended = access.dj?.vetting_status === "suspended";
    const gated: { href: string; label: string }[] = [...LIMITED_DJ_NAV];
    if (
      !isSuspended &&
      (access.state === "DJ_APPLICATION_NOT_STARTED" ||
        access.state === "DJ_APPLICATION_PENDING" ||
        access.state === "DJ_APPLICATION_REJECTED")
    ) {
      gated.splice(2, 0, { href: "/dj/apply", label: "Apply" });
    }
    navItems = gated;
    gateBanner = <DjWorkspaceGateBanner accessState={access.state} message={access.message} />;
  }

  const workspaceBanner = await getAdminWorkspaceTestBannerState();

  const nav = shellBlocked ? null : (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="dj-nav-link underline-offset-4 hover:underline">
          {item.label}
        </Link>
      ))}
    </>
  );

  const chrome = (
    <WorkspaceChrome
      kicker="DJ deck"
      nav={nav}
      mobileTabs={
        shellBlocked
          ? []
          : access.state === "DJ_APPROVED"
            ? DJ_MOBILE_TABS_APPROVED
            : DJ_MOBILE_TABS_LIMITED
      }
      initialUnread={unread}
      showNotifications={!shellBlocked}
    />
  );

  return (
    <div className="flex min-h-full flex-col">
      {workspaceBanner.show ? <AdminWorkspaceTestBanner role={workspaceBanner.role} /> : null}
      {chrome}
      {gateBanner}
      <main className="mobile-shell-main flex flex-1 flex-col px-4 py-6">{shellBlocked ? (
          <AccountAccessGate state={access.state} message={access.message} />
        ) : (
          children
        )}</main>
      <footer className="shell-desktop dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
