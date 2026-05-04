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
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold leading-none">Direct 2 DJ</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Artist</span>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/dashboard">
            Dashboard
          </Link>
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/tracks">
            Tracks
          </Link>
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/tracks/new">
            New pack
          </Link>
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/analytics">
            Analytics
          </Link>
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/play-reports">
            Play reports
          </Link>
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/promote">
            Promote
          </Link>
          <Link className="text-zinc-700 hover:underline dark:text-zinc-300" href="/artist/billing">
            Billing
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <NotificationBell initialUnread={unread} />
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="min-h-10 rounded-md px-3 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Link href="/" className="underline underline-offset-4">
          Home
        </Link>
      </footer>
    </div>
  );
}
