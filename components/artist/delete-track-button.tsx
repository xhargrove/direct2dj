"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTrack } from "@/app/artist/tracks/actions";

export function DeleteTrackButton({
  trackId,
  trackTitle,
  canDelete,
  redirectTo = "/artist/tracks",
  deleteFn,
  className,
  children,
}: {
  trackId: string;
  trackTitle?: string;
  canDelete: boolean;
  redirectTo?: string;
  /** When set (e.g. label-managed packs), runs instead of the artist `deleteTrack` action. */
  deleteFn?: (trackId: string) => Promise<{ error?: string } | { ok: true }>;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canDelete) return null;

  async function onDelete() {
    const name = trackTitle?.trim() || "this DJ pack";
    if (
      !window.confirm(
        `Delete “${name}”? This removes the track and all uploaded pack files. This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setPending(true);
    const r = deleteFn ? await deleteFn(trackId) : await deleteTrack(trackId);
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onDelete()}
        className={
          className ??
          "text-sm font-medium text-red-600 underline decoration-red-600/30 underline-offset-2 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        }
      >
        {children ?? (pending ? "Deleting…" : "Delete")}
      </button>
      {error ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
