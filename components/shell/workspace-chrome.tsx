import type { ReactNode } from "react";
import { AppTopNav } from "@/components/shell/app-top-nav";
import { MobileBottomTabs } from "@/components/shell/mobile-bottom-tabs";
import { MobileWorkspaceHeader } from "@/components/shell/mobile-workspace-header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SignOutButton } from "@/components/shell/sign-out-button";
import type { ShellTab } from "@/lib/platform/shell-mode";

export function WorkspaceChrome({
  kicker,
  nav,
  mobileTabs,
  initialUnread,
  showNotifications,
}: {
  kicker: string;
  nav: ReactNode;
  mobileTabs: readonly ShellTab[];
  initialUnread: number;
  showNotifications: boolean;
}) {
  const trailing = (
    <>
      {showNotifications ? <NotificationBell initialUnread={initialUnread} /> : null}
      <SignOutButton />
    </>
  );

  return (
    <>
      <div className="shell-desktop">
        <AppTopNav kicker={kicker} nav={nav} trailing={trailing} />
      </div>
      <MobileWorkspaceHeader
        kicker={kicker}
        initialUnread={initialUnread}
        showNotifications={showNotifications}
      />
      <MobileBottomTabs tabs={mobileTabs} />
    </>
  );
}
