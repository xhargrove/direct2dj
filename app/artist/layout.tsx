import Link from "next/link";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { requireRoles } from "@/lib/auth/require-role";
import { getAdminWorkspaceTestBannerState } from "@/lib/auth/admin-workspace-test-banner-state";
import { AdminWorkspaceTestBanner } from "@/components/admin/admin-workspace-test-banner";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { ARTIST_MOBILE_TABS } from "@/lib/platform/mobile-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["artist"]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const unread = user ? await getUnreadNotificationCount() : 0;
  const workspaceBanner = await getAdminWorkspaceTestBannerState();

  const nav = (
    <>
      <Link className="dj-nav-link hover:underline" href="/artist/dashboard">
        Dashboard
      </Link>
      <Link className="dj-nav-link hover:underline" href="/artist/tracks">
        Tracks
      </Link>
      <Link className="dj-nav-link hover:underline" href="/artist/tracks/new">
        New pack
      </Link>
      <Link className="dj-nav-link hover:underline" href="/artist/analytics">
        Track analytics
      </Link>
      <Link className="dj-nav-link hover:underline" href="/artist/play-reports">
        Play reports
      </Link>
      <Link className="dj-nav-link hover:underline" href="/artist/promote">
        Featured Spotlight
      </Link>
      <Link className="dj-nav-link hover:underline" href="/artist/billing">
        Billing
      </Link>
    </>
  );

  return (
    <div className="flex min-h-full flex-col">
      {workspaceBanner.show ? <AdminWorkspaceTestBanner role={workspaceBanner.role} /> : null}
      <WorkspaceChrome
        kicker="Artist booth"
        nav={nav}
        mobileTabs={ARTIST_MOBILE_TABS}
        initialUnread={unread}
        showNotifications
      />
      <main className="mobile-shell-main flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="shell-desktop dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
