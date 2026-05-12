import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AppTopNav({
  kicker,
  nav,
  trailing,
}: {
  kicker: string;
  nav: ReactNode;
  trailing: ReactNode;
}) {
  return (
    <header className="dj-header flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <Link href="/" className="flex w-fit shrink-0 items-center gap-2 no-underline">
        <Image
          src="/site-logo.png"
          alt="Digital Service Pack logo"
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-md"
          priority
        />
        <div className="flex flex-col gap-0.5">
          <span className="dj-brand text-sm font-semibold leading-none tracking-tight text-foreground">
            Digital Service Pack
          </span>
          <span className="text-xs text-zinc-400">{kicker}</span>
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end lg:gap-6">
        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-sm font-medium lg:justify-center">{nav}</div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{trailing}</div>
      </div>
    </header>
  );
}
