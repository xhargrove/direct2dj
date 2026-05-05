"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminApproveDj,
  adminAssignDjTier,
  adminDeleteDjApplicant,
  adminRejectDj,
  adminSuspendDj,
} from "@/app/admin/actions";
import { djTierLabel } from "@/lib/dj/tier-label";
import type { DjTier, DjVettingStatus } from "@/lib/types/database";

const TIERS: DjTier[] = ["verified", "club_dj", "radio_dj", "influencer_dj", "curator"];

/** Fixed locale + options so SSR and client output match (default locale differs Node vs browser). */
const DISPLAY_DATETIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

type AppSnippet = {
  dj_name: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  crew_organization_name: string | null;
  updated_at: string;
  years_djing: number | null;
  primary_genres: string | null;
} | null;

export function DjVettingRow({
  djId,
  displayName,
  vettingStatus,
  djTier,
  application,
}: {
  djId: string;
  displayName: string;
  vettingStatus: DjVettingStatus;
  djTier: DjTier | null;
  application: AppSnippet | AppSnippet[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [tierPick, setTierPick] = useState<DjTier>(djTier ?? "verified");

  const app = Array.isArray(application) ? application[0] ?? null : application;

  async function run(fn: () => Promise<{ error?: string } | { ok?: true }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if ("error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">{displayName}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Status: <span className="capitalize">{vettingStatus}</span>
            {djTier ? ` · Tier: ${djTierLabel(djTier)}` : ""}
          </div>
        </div>
      </div>

      {app ? (
        <dl className="mt-3 grid gap-1 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Application name</dt>
            <dd>{app.dj_name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Location</dt>
            <dd>
              {app.city}, {app.state}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd>{app.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Phone</dt>
            <dd>{app.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Crew / organization</dt>
            <dd>{app.crew_organization_name?.trim() ? app.crew_organization_name : "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Genres</dt>
            <dd>{app.primary_genres ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Years DJing</dt>
            <dd>{app.years_djing ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Updated</dt>
            <dd>{new Date(app.updated_at).toLocaleString("en-US", DISPLAY_DATETIME)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">No application form on file.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {vettingStatus === "pending" || vettingStatus === "rejected" ? (
          <>
            <select
              value={tierPick}
              disabled={pending}
              onChange={(e) => setTierPick(e.target.value as DjTier)}
              className="min-h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {djTierLabel(t)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !app}
              className="inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-3 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => run(() => adminApproveDj(djId, tierPick))}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
              onClick={() => run(() => adminRejectDj(djId))}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex min-h-10 items-center rounded-md border border-red-400 bg-red-50 px-3 text-sm font-medium text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
              onClick={() => {
                const ok = window.confirm(
                  "Permanently delete this applicant? Their login will be removed and all DJ data for this account will be erased. This cannot be undone.",
                );
                if (!ok) return;
                run(() => adminDeleteDjApplicant(djId));
              }}
            >
              Remove…
            </button>
          </>
        ) : null}

        {vettingStatus === "approved" ? (
          <>
            <select
              value={tierPick}
              disabled={pending}
              onChange={(e) => setTierPick(e.target.value as DjTier)}
              className="min-h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {djTierLabel(t)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              className="inline-flex min-h-10 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => run(() => adminAssignDjTier(djId, tierPick))}
            >
              Save tier
            </button>
          </>
        ) : null}

        {vettingStatus !== "suspended" ? (
          <button
            type="button"
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded-md border border-red-300 px-3 text-sm text-red-800 dark:border-red-900 dark:text-red-200"
            onClick={() => run(() => adminSuspendDj(djId))}
          >
            Suspend
          </button>
        ) : null}
      </div>

      {msg ? <p className="mt-2 text-xs text-red-600">{msg}</p> : null}
    </li>
  );
}
