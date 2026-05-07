"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveTrack,
  deleteFeaturedPlacement,
  rejectTrack,
  setTrackCatalogActive,
  upsertFeaturedPlacement,
} from "@/app/admin/actions";
import type { FeaturedPlacement } from "@/lib/types/database";

type Props = {
  trackId: string;
  moderationStatus: string;
  catalogActive: boolean;
  featuredRows: FeaturedPlacement[];
};

export function TrackReviewActions({
  trackId,
  moderationStatus,
  catalogActive,
  featuredRows,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-6">
      {message ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {message}
        </p>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Moderation</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || moderationStatus === "approved"}
            className="min-h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const r = await approveTrack(trackId);
                setMessage("error" in r ? (r.error ?? "Error") : "Track approved.");
                refresh();
              })
            }
          >
            Approve track
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="reject-reason" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Reject with reason
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain what needs to change…"
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-600"
          />
          <button
            type="button"
            disabled={pending}
            className="min-h-10 self-start rounded-md border border-red-300 px-4 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-300"
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const r = await rejectTrack(trackId, rejectReason);
                setMessage("error" in r ? (r.error ?? "Error") : "Track rejected.");
                refresh();
              })
            }
          >
            Reject track
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Catalog visibility</h2>
        <p className="text-xs text-zinc-500">
          When hidden, DJs cannot discover or interact with this track even if it is approved.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={catalogActive}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                setMessage(null);
                const r = await setTrackCatalogActive(trackId, e.target.checked);
                setMessage(
                  "error" in r
                    ? (r.error ?? "Error")
                    : e.target.checked
                      ? "Track visible in catalog."
                      : "Track hidden from catalog.",
                );
                refresh();
              })
            }
          />
          Visible in DJ catalog
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Featured placement</h2>
        <p className="text-xs text-zinc-500">
          Approved placements show to DJs only during the date window; after the end date they drop off automatically.
        </p>

        {featuredRows.map((fp) => (
          <FeaturedRowEditor
            key={fp.id}
            trackId={trackId}
            placement={fp}
            pending={pending}
            startTransition={startTransition}
            setMessage={setMessage}
            refresh={refresh}
          />
        ))}

        <NewFeaturedForm
          trackId={trackId}
          pending={pending}
          startTransition={startTransition}
          setMessage={setMessage}
          refresh={refresh}
        />
      </section>
    </div>
  );
}

function FeaturedRowEditor({
  trackId,
  placement,
  pending,
  startTransition,
  setMessage,
  refresh,
}: {
  trackId: string;
  placement: FeaturedPlacement;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  setMessage: (s: string | null) => void;
  refresh: () => void;
}) {
  const [label, setLabel] = useState(placement.label ?? "");
  const [starts, setStarts] = useState(toLocalInput(placement.starts_at));
  const [ends, setEnds] = useState(toLocalInput(placement.ends_at));

  const expired = placement.ends_at ? new Date(placement.ends_at) < new Date() : false;

  return (
    <div className="rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Placement</span>
        {expired ? (
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700">Ended</span>
        ) : (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
            Active window
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Starts (local)
          <input
            type="datetime-local"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          Ends (local)
          <input
            type="datetime-local"
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="min-h-9 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const r = await upsertFeaturedPlacement({
                trackId,
                placementId: placement.id,
                label,
                startsAt: fromLocalInput(starts),
                endsAt: fromLocalInput(ends),
              });
              setMessage("error" in r ? (r.error ?? "Error") : "Featured placement updated.");
              refresh();
            })
          }
        >
          Save placement
        </button>
        <button
          type="button"
          disabled={pending}
          className="min-h-9 rounded-md border border-zinc-300 px-3 text-xs dark:border-zinc-600"
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const r = await deleteFeaturedPlacement(placement.id, trackId);
              setMessage("error" in r ? (r.error ?? "Error") : "Placement removed.");
              refresh();
            })
          }
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function NewFeaturedForm({
  trackId,
  pending,
  startTransition,
  setMessage,
  refresh,
}: {
  trackId: string;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  setMessage: (s: string | null) => void;
  refresh: () => void;
}) {
  const [label, setLabel] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");

  return (
    <div className="rounded-md border border-dashed border-zinc-300 p-3 dark:border-zinc-600">
      <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Add placement</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Starts (local)
          <input
            type="datetime-local"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          Ends (local)
          <input
            type="datetime-local"
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        className="mt-2 min-h-9 rounded-md border border-zinc-300 px-3 text-xs dark:border-zinc-600"
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const r = await upsertFeaturedPlacement({
              trackId,
              label,
              startsAt: fromLocalInput(starts),
              endsAt: fromLocalInput(ends),
            });
            setMessage("error" in r ? (r.error ?? "Error") : "Featured placement created.");
            setLabel("");
            setStarts("");
            setEnds("");
            refresh();
          })
        }
      >
        Add featured placement
      </button>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
