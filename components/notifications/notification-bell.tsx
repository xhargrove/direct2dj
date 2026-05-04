"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadNotificationsForBell,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import type { Notification } from "@/lib/types/database";

function hrefFromMeta(meta: Record<string, unknown>): string | null {
  const h = meta.href;
  return typeof h === "string" && h.length > 0 ? h : null;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Notification[]>([]);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const res = await loadNotificationsForBell();
      setItems(res.notifications);
      setUnread(res.unreadCount);
    });
  }, [open]);

  async function refreshBell() {
    const res = await loadNotificationsForBell();
    setItems(res.notifications);
    setUnread(res.unreadCount);
    router.refresh();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex min-h-10 min-w-10 items-center justify-center rounded-md border border-zinc-300 text-sm dark:border-zinc-600"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">Notifications</span>
        <span aria-hidden>🔔</span>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              type="button"
              disabled={pending || unread === 0}
              className="text-xs text-zinc-600 underline-offset-4 hover:underline disabled:opacity-40 dark:text-zinc-400"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead();
                  await refreshBell();
                })
              }
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-zinc-500">No notifications yet.</li>
            ) : (
              items.map((n) => {
                const href = hrefFromMeta(n.metadata);
                const unreadRow = !n.read_at;
                const inner = (
                  <>
                    <div className="text-sm font-medium leading-snug">{n.title}</div>
                    {n.body ? (
                      <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {n.body}
                      </div>
                    ) : null}
                    <div className="mt-1 text-[10px] text-zinc-400">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </>
                );
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        className={`block px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                          unreadRow ? "bg-zinc-50/80 dark:bg-zinc-900/40" : ""
                        }`}
                        onClick={() =>
                          startTransition(async () => {
                            if (unreadRow) {
                              await markNotificationRead(n.id);
                              await refreshBell();
                            }
                          })
                        }
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                          unreadRow ? "bg-zinc-50/80 dark:bg-zinc-900/40" : ""
                        }`}
                        onClick={() =>
                          startTransition(async () => {
                            if (unreadRow) {
                              await markNotificationRead(n.id);
                              await refreshBell();
                            }
                          })
                        }
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
