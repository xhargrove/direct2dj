import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function MobileWorkspaceHeader({
  kicker,
  initialUnread,
  showNotifications,
}: {
  kicker: string;
  initialUnread: number;
  showNotifications: boolean;
}) {
  return (
    <header className="shell-mobile dj-header sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
      <Link href="/" className="flex min-w-0 items-center gap-2 no-underline">
        <SiteLogo width={120} height={150} className="h-8 w-auto shrink-0 object-contain" priority />
        <div className="min-w-0">
          <p className="dj-brand truncate text-sm font-semibold leading-none tracking-tight">Digital Service Pack</p>
          <p className="truncate text-[11px] text-zinc-400">{kicker}</p>
        </div>
      </Link>
      {showNotifications ? <NotificationBell initialUnread={initialUnread} /> : null}
    </header>
  );
}
