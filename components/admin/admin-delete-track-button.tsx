"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminDeleteTrack } from "@/app/admin/actions";

export function AdminDeleteTrackButton({ trackId, trackTitle }: { trackId: string; trackTitle: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const name = trackTitle.trim() || "this track";
    if (
      !window.confirm(
        `Permanently delete “${name}”? This removes the track, all pack files in storage, and related data (submissions, engagement, etc.). This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setPending(true);
    const r = await adminDeleteTrack(trackId);
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onDelete()}
        className="text-sm font-medium text-red-600 underline decoration-red-600/30 underline-offset-2 hover:text-red-700 disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <p className="max-w-[12rem] text-right text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
