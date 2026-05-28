import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { adminWorkspaceTestEnabled, getAdminWorkspaceTestSecret } from "@/lib/auth/admin-workspace-test";
import { isCoAdminRole } from "@/lib/auth/backstage-access";
import { requireRoles } from "@/lib/auth/require-role";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminSidebarNavMobile } from "@/components/admin/admin-sidebar-nav-mobile";
import { AdminWorkspaceTestMenu } from "@/components/admin/admin-workspace-test-menu";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { coAdminNav, fullAdminNav } from "@/lib/admin/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRoles(["admin", "co_admin"]);
  const uploadOnly = isCoAdminRole(profile.role);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const unread = user ? await getUnreadNotificationCount() : 0;

  const showWorkspaceTest = adminWorkspaceTestEnabled() && Boolean(getAdminWorkspaceTestSecret());

  const nav = uploadOnly ? coAdminNav : fullAdminNav;
  const kicker = uploadOnly ? "Backstage · Upload" : "Backstage";

  const trailing = (
    <>
      {showWorkspaceTest ? <AdminWorkspaceTestMenu /> : null}
      <NotificationBell initialUnread={unread} />
      <form action="/auth/sign-out" method="post">
        <button type="submit" className="dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline">
          Sign out
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="dj-sidebar flex w-full shrink-0 flex-col border-b border-white/7 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2 no-underline">
            <SiteLogo width={164} height={205} className="h-9 w-auto shrink-0 object-contain" priority />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="dj-brand truncate text-sm font-semibold leading-none tracking-tight text-foreground">
                Digital Service Pack
              </span>
              <span className="truncate text-xs text-zinc-400">{kicker}</span>
            </div>
          </Link>
          <div className="shell-desktop flex shrink-0 flex-wrap items-center justify-end gap-2 lg:hidden">{trailing}</div>
        </div>
        <div className="hidden lg:block lg:flex-1 lg:overflow-y-auto">
          <AdminSidebarNav items={nav} />
        </div>
        <AdminSidebarNavMobile items={nav} />
        <div className="shell-desktop hidden border-t border-white/7 px-3 py-3 lg:block">
          <div className="flex flex-col gap-2">{trailing}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mobile-shell-main flex flex-1 flex-col px-4 py-6">{children}</main>
        <footer className="shell-desktop dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
            Home
          </Link>
        </footer>
        <footer className="shell-mobile border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SignOutButton className="dj-btn-ghost min-h-11 w-full rounded-lg border px-4 text-sm font-medium" />
        </footer>
      </div>
    </div>
  );
}
