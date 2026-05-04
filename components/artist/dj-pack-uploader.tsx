"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { packSlotToTrackFileKind } from "@/lib/tracks/file-kind";
import {
  OPTIONAL_PACK_SLOTS,
  PACK_SLOT_LABELS,
  REQUIRED_PACK_SLOTS,
  type PackSlot,
} from "@/lib/tracks/pack-slots";
import { assertMimeForSlot, safeStorageFileName } from "@/lib/tracks/upload-rules";
import type { TrackFile } from "@/lib/types/database";

type SlotState = "idle" | "uploading" | "done" | "error";

export function DjPackUploader({
  trackId,
  files: initialFiles,
  readOnly,
  onUploaded,
}: {
  trackId: string;
  files: TrackFile[];
  readOnly?: boolean;
  onUploaded?: () => void;
}) {
  const router = useRouter();
  const [slotPhase, setSlotPhase] = useState<Partial<Record<PackSlot, SlotState>>>({});
  const [slotPct, setSlotPct] = useState<Partial<Record<PackSlot, number>>>({});
  const [error, setError] = useState<string | null>(null);

  const bySlot = useMemo(() => {
    const m = new Map<PackSlot, TrackFile>();
    for (const f of initialFiles) {
      if (f.pack_slot) {
        m.set(f.pack_slot as PackSlot, f);
      }
    }
    return m;
  }, [initialFiles]);

  const uploadSlot = useCallback(
    async (slot: PackSlot, file: File) => {
      if (readOnly) return;
      setError(null);
      try {
        assertMimeForSlot(slot, file.type);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid file type");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        return;
      }

      setSlotPhase((s) => ({ ...s, [slot]: "uploading" }));
      setSlotPct((s) => ({ ...s, [slot]: 8 }));

      const existing = bySlot.get(slot);
      if (existing?.storage_path) {
        await supabase.storage.from("promos").remove([existing.storage_path]);
        await supabase.from("track_files").delete().eq("id", existing.id);
      }

      const path = `${user.id}/tracks/${trackId}/${slot}_${safeStorageFileName(file.name)}`;
      setSlotPct((s) => ({ ...s, [slot]: 35 }));

      const { error: upErr } = await supabase.storage
        .from("promos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (upErr) {
        setSlotPhase((s) => ({ ...s, [slot]: "error" }));
        setError(upErr.message);
        return;
      }

      setSlotPct((s) => ({ ...s, [slot]: 72 }));

      const kind = packSlotToTrackFileKind(slot);
      const { error: insErr } = await supabase.from("track_files").insert({
        track_id: trackId,
        pack_slot: slot,
        storage_path: path,
        mime_type: file.type,
        byte_size: file.size,
        kind,
        sort_order: 0,
      });

      if (insErr) {
        setSlotPhase((s) => ({ ...s, [slot]: "error" }));
        setError(insErr.message);
        return;
      }

      setSlotPct((s) => ({ ...s, [slot]: 100 }));
      setSlotPhase((s) => ({ ...s, [slot]: "done" }));
      router.refresh();
      onUploaded?.();
      setTimeout(() => {
        setSlotPhase((s) => ({ ...s, [slot]: "idle" }));
        setSlotPct((s) => {
          const n = { ...s };
          delete n[slot];
          return n;
        });
      }, 600);
    },
    [bySlot, onUploaded, readOnly, router, trackId],
  );

  function slotProgress(slot: PackSlot) {
    const phase = slotPhase[slot];
    const pct = slotPct[slot];
    if (phase === "uploading" && pct != null) {
      return (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full bg-zinc-900 transition-[width] duration-300 dark:bg-zinc-100"
            style={{ width: `${pct}%` }}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Required DJ pack files
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Upload every required file before submitting for admin review. Allowed: images (JPEG, PNG,
          WebP) for artwork; MP3, WAV, FLAC, M4A, AAC for audio.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4">
        {REQUIRED_PACK_SLOTS.map((slot) => (
          <li
            key={slot}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">*</span>{" "}
                <span className="text-sm font-medium">{PACK_SLOT_LABELS[slot]}</span>
                {bySlot.get(slot) ? (
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {bySlot.get(slot)?.storage_path.split("/").pop()}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Missing</p>
                )}
              </div>
              <label className="shrink-0">
                <span className="sr-only">Upload {PACK_SLOT_LABELS[slot]}</span>
                <input
                  type="file"
                  disabled={readOnly || slotPhase[slot] === "uploading"}
                  accept={slot === "cover_art" ? "image/jpeg,image/png,image/webp" : "audio/*"}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadSlot(slot, f);
                  }}
                />
              </label>
            </div>
            {slotProgress(slot)}
          </li>
        ))}
      </ul>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Optional edits
        </h3>
        <ul className="mt-3 space-y-4">
          {OPTIONAL_PACK_SLOTS.map((slot) => (
            <li
              key={slot}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-sm font-medium">{PACK_SLOT_LABELS[slot]}</span>
                  {bySlot.get(slot) ? (
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {bySlot.get(slot)?.storage_path.split("/").pop()}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">Not uploaded</p>
                  )}
                </div>
                <label className="shrink-0">
                  <input
                    type="file"
                    disabled={readOnly || slotPhase[slot] === "uploading"}
                    accept="audio/*"
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 dark:file:bg-zinc-800"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadSlot(slot, f);
                    }}
                  />
                </label>
              </div>
              {slotProgress(slot)}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-zinc-500">
        Required slots:{" "}
        {REQUIRED_PACK_SLOTS.every((s) => bySlot.get(s))
          ? "All required files attached."
          : "Complete all required uploads before submitting."}
      </p>
    </div>
  );
}
