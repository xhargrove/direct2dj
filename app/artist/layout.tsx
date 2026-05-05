import Link from "next/link";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { requireRoles } from "@/lib/auth/require-role";
import { NotificationBell } from "@/components/notifications/notification-bell";
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

  return (
    <div className="flex min-h-full flex-col">
      <header className="dj-header flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="dj-brand text-sm font-semibold leading-none tracking-tight">Direct 2 DJ</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Artist booth</span>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
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
            Analytics
          </Link>
          <Link className="dj-nav-link hover:underline" href="/artist/play-reports">
            Play reports
          </Link>
          <Link className="dj-nav-link hover:underline" href="/artist/promote">
            Promote
          </Link>
          <Link className="dj-nav-link hover:underline" href="/artist/billing">
            Billing
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <NotificationBell initialUnread={unread} />
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
