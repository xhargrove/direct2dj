"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { hardNavigate, isNativeAppShell, NATIVE_LINK_ATTR } from "@/lib/capacitor/navigation";

type ShellLinkProps = ComponentProps<typeof Link>;

function hrefToPath(href: ShellLinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "/";
  const search = href.search ?? "";
  const hash = href.hash ?? "";
  return `${pathname}${search}${hash}`;
}

/** Same-origin link that uses a full document load in the native Capacitor shell. */
export function ShellLink({ href, onClick, prefetch = false, ...props }: ShellLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      data-dsp-native-link=""
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!isNativeAppShell()) return;

        event.preventDefault();
        hardNavigate(hrefToPath(href));
      }}
    />
  );
}
