import Link from "next/link";
import { adminWorkspaceTestEnabled, getAdminWorkspaceTestSecret } from "@/lib/auth/admin-workspace-test";
import { requireRoles } from "@/lib/auth/require-role";
import { AdminWorkspaceTestMenu } from "@/components/admin/admin-workspace-test-menu";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AppTopNav } from "@/components/shell/app-top-nav";
import { createClient } from "@/lib/supabase/server";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/tracks/new", label: "New DJ pack" },
  { href: "/admin/featured", label: "Featured" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/djs", label: "DJs" },
  { href: "/admin/dj-activity", label: "DJ activity" },
  { href: "/admin/dj-applications", label: "DJ applications" },
  { href: "/admin/dj-organizations", label: "DJ organizations" },
  { href: "/admin/play-reports", label: "Play reports" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["admin"]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const unread = user ? await getUnreadNotificationCount() : 0;

  const showWorkspaceTest = adminWorkspaceTestEnabled() && Boolean(getAdminWorkspaceTestSecret());

  const navLinks = (
    <>
      {nav.map((item) => (
        <Link key={item.href} href={item.href} className="dj-nav-link underline-offset-4 hover:underline">
          {item.label}
        </Link>
      ))}
    </>
  );

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
    <div className="flex min-h-full flex-col">
      <AppTopNav kicker="Backstage" nav={navLinks} trailing={trailing} />
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
