import { authGetUserOrTimeout } from "@/lib/supabase/auth-bounded";
import { createClient } from "@/lib/supabase/server";
import { maybeSingleTimeoutFallback } from "@/lib/supabase/maybe-single-timeout-fallback";
import { withTimeout } from "@/lib/supabase/with-timeout";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";
import { getUnreadNotificationCount } from "@/app/notifications/actions";
import { MarketingSiteHeaderClient } from "@/components/shell/marketing-site-header-client";

/** Public chrome: home, featured, login — desktop nav; compact bar in native app. */
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

  return (
    <MarketingSiteHeaderClient
      signedIn={Boolean(user)}
      initialUnread={unread}
      openAppHref={openApp?.href ?? null}
      openAppLabel={openApp?.label ?? null}
    />
  );
}
