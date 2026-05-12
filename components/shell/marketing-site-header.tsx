import Link from "next/link";
import { authGetUserOrTimeout } from "@/lib/supabase/auth-bounded";
import { createClient } from "@/lib/supabase/server";
import { maybeSingleTimeoutFallback } from "@/lib/supabase/maybe-single-timeout-fallback";
import { withTimeout } from "@/lib/supabase/with-timeout";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AppTopNav } from "./app-top-nav";

/** Public chrome: home, featured, login — matches marketing mock when signed out. */
export async function MarketingSiteHeader() {
  let user: { id: string } | null = null;
  let openApp: { href: string; label: string } | null = null;
  let unread = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await authGetUserOrTimeout(supabase);
    user = u;
    if (user) {
      unread = await getUnreadNotificationCount();
      const profileRow = await withTimeout(
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        4000,
        maybeSingleTimeoutFallback<{ role: string }>(),
      );
      const profile = profileRow.data;
      if (profile?.role && isUserRole(profile.role)) {
        openApp = {
          href: dashboardPathForRole(profile.role),
          label: "Open workspace",
        };
      }
    }
  } catch {
    // Config missing — still render signed-out chrome.
  }

  const nav = (
    <>
      <Link href="/" className="dj-nav-link underline-offset-4 hover:underline">
        Home
      </Link>
      <Link href="/featured" className="dj-nav-link underline-offset-4 hover:underline">
        Featured
      </Link>
    </>
  );

  const trailing = user ? (
    <>
      <NotificationBell initialUnread={unread} />
      {openApp ? (
        <Link href={openApp.href} className="dj-btn-primary min-h-10 px-4 py-2 text-sm">
          {openApp.label}
        </Link>
      ) : null}
      <form action="/auth/sign-out" method="post">
        <button type="submit" className="dj-nav-link min-h-10 rounded-full px-3 text-sm font-medium hover:underline">
          Sign out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="dj-btn-ghost min-h-10 border px-4 py-2 text-sm font-medium no-underline hover:no-underline"
      >
        Log in
      </Link>
      <Link href="/login?mode=signup" className="dj-btn-primary min-h-10 px-4 py-2 text-sm no-underline hover:no-underline">
        Sign up
      </Link>
    </>
  );

  return <AppTopNav kicker="Promo lane" nav={nav} trailing={trailing} />;
}
