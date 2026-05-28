"use client";

import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { AppTopNav } from "@/components/shell/app-top-nav";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function MarketingSiteHeaderClient({
  signedIn,
  initialUnread,
  openAppHref,
  openAppLabel,
}: {
  signedIn: boolean;
  initialUnread: number;
  openAppHref: string | null;
  openAppLabel: string | null;
}) {
  const nav = (
    <>
      <Link href="/" className="dj-nav-link underline-offset-4 hover:underline">
        Home
      </Link>
      <Link href="/featured" className="dj-nav-link underline-offset-4 hover:underline">
        How it works
      </Link>
    </>
  );

  const desktopTrailing = signedIn ? (
    <>
      <NotificationBell initialUnread={initialUnread} />
      {openAppHref ? (
        <Link href={openAppHref} className="dj-btn-primary min-h-10 px-4 py-2 text-sm">
          {openAppLabel}
        </Link>
      ) : null}
      <SignOutButton className="dj-nav-link min-h-10 rounded-full px-3 text-sm font-medium hover:underline" />
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

  const mobileTrailing = signedIn ? (
    openAppHref ? (
      <Link href={openAppHref} className="dj-btn-primary min-h-10 px-3 py-2 text-xs">
        Open
      </Link>
    ) : null
  ) : (
    <Link href="/login" className="dj-btn-primary min-h-10 px-3 py-2 text-xs">
      Log in
    </Link>
  );

  return (
    <>
      <div className="shell-desktop">
        <AppTopNav kicker="Promo lane" nav={nav} trailing={desktopTrailing} />
      </div>
      <header className="shell-mobile dj-header sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex min-w-0 items-center gap-2 no-underline">
          <SiteLogo width={120} height={150} className="h-8 w-auto shrink-0 object-contain" priority />
          <span className="dj-brand truncate text-sm font-semibold leading-none tracking-tight">Digital Service Pack</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">{mobileTrailing}</div>
      </header>
    </>
  );
}
