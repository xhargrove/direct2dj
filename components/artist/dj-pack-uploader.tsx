"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { packSlotToTrackFileKind } from "@/lib/tracks/file-kind";
import {
  ADDITIONAL_PACK_SLOTS,
  ESSENTIAL_AUDIO_SLOTS,
  OPTIONAL_PACK_SLOTS,
  PACK_SLOT_LABELS,
  REQUIRED_COVER_SLOT,
  type PackSlot,
} from "@/lib/tracks/pack-slots";
import { packFileDisplayName } from "@/lib/tracks/dj-download-filename";
import { packStorageObjectBasename } from "@/lib/tracks/pack-storage-basename";
import { assertMimeForSlot } from "@/lib/tracks/upload-rules";
import type { TrackFile } from "@/lib/types/database";

type SlotState = "idle" | "uploading" | "done" | "error";

export function DjPackUploader({
  trackId,
  files: initialFiles,
  readOnly,
  onUploaded,
  /** When set (admin track review only), pack files are stored under this profile id’s prefix — the artist’s account, not the admin’s. */
  artistProfileIdForStorage,
  /** Release metadata — used so legacy storage names (e.g. `radio_edit_CertifiedTexan.mp3`) show as DJ-friendly download names. */
  releaseTitle,
  creditArtistName,
}: {
  trackId: string;
  files: TrackFile[];
  readOnly?: boolean;
  onUploaded?: () => void;
  artistProfileIdForStorage?: string;
  releaseTitle?: string;
  creditArtistName?: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<TrackFile[]>(initialFiles);
  const [slotPhase, setSlotPhase] = useState<Partial<Record<PackSlot, SlotState>>>({});
  const [slotPct, setSlotPct] = useState<Partial<Record<PackSlot, number>>>({});
  const [error, setError] = useState<string | null>(null);

  const bySlot = useMemo(() => {
    const m = new Map<PackSlot, TrackFile>();
    for (const f of files) {
      if (f.pack_slot) {
        m.set(f.pack_slot as PackSlot, f);
      }
    }
    return m;
  }, [files]);

  const fileCaption = useCallback(
    (f: TrackFile | undefined) => {
      if (!f?.storage_path) return "";
      return packFileDisplayName(
        { pack_slot: f.pack_slot, storage_path: f.storage_path },
        { title: releaseTitle, credit_artist_name: creditArtistName },
      );
    },
    [releaseTitle, creditArtistName],
  );

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

      setSlotPhase((s) => ({ ...s, [slot]: "uploading" }));
      setSlotPct((s) => ({ ...s, [slot]: 8 }));

      if (artistProfileIdForStorage?.trim()) {
        setSlotPct((s) => ({ ...s, [slot]: 55 }));
        const fd = new FormData();
        fd.append("trackId", trackId);
        fd.append("slot", slot);
        fd.append("file", file);
        const res = await fetch("/api/admin/tracks/pack-slot", {
          method: "POST",
          body: fd,
        });
        let r: { ok?: boolean; error?: string; file?: TrackFile };
        try {
          r = (await res.json()) as { ok?: boolean; error?: string; file?: TrackFile };
        } catch {
          setSlotPhase((s) => ({ ...s, [slot]: "error" }));
          setError("Upload failed.");
          return;
        }
        if (!res.ok || r.error) {
          setSlotPhase((s) => ({ ...s, [slot]: "error" }));
          setError(r.error ?? "Upload failed.");
          return;
        }
        if (r.ok && r.file) {
          setFiles((prev) => {
            const rest = prev.filter((f) => f.pack_slot !== slot);
            return [...rest, r.file as TrackFile];
          });
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

      const storagePrefix = user.id;

      setSlotPct((s) => ({ ...s, [slot]: 12 }));

      const existing = bySlot.get(slot);
      if (existing?.storage_path) {
        await supabase.storage.from("promos").remove([existing.storage_path]);
        await supabase.from("track_files").delete().eq("id", existing.id);
      }

      const path = `${storagePrefix}/tracks/${trackId}/${packStorageObjectBasename(slot, file, {
        title: releaseTitle,
        credit_artist_name: creditArtistName,
      })}`;
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
      const { data: inserted, error: insErr } = await supabase
        .from("track_files")
        .insert({
          track_id: trackId,
          pack_slot: slot,
          storage_path: path,
          mime_type: file.type,
          byte_size: file.size,
          kind,
          sort_order: 0,
        })
        .select("*")
        .single();

      if (insErr) {
        setSlotPhase((s) => ({ ...s, [slot]: "error" }));
        setError(insErr.message);
        return;
      }

      if (inserted) {
        setFiles((prev) => {
          const rest = prev.filter((f) => f.pack_slot !== slot);
          return [...rest, inserted as TrackFile];
        });
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
    [artistProfileIdForStorage, bySlot, onUploaded, readOnly, router, trackId],
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

  const coverMet = Boolean(bySlot.get(REQUIRED_COVER_SLOT));
  const essentialMet = ESSENTIAL_AUDIO_SLOTS.some((s) => Boolean(bySlot.get(s)));
  const submissionPackMet = coverMet && essentialMet;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Cover artwork (required)
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          JPEG, PNG, or WebP. Required before you can submit for admin review.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4">
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">*</span>{" "}
              <span className="text-sm font-medium">{PACK_SLOT_LABELS.cover_art}</span>
              {bySlot.get(REQUIRED_COVER_SLOT) ? (
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {fileCaption(bySlot.get(REQUIRED_COVER_SLOT))}
                </p>
              ) : (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Missing</p>
              )}
            </div>
            <label className="shrink-0">
              <span className="sr-only">Upload cover artwork</span>
              <input
                type="file"
                disabled={readOnly || slotPhase[REQUIRED_COVER_SLOT] === "uploading"}
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadSlot(REQUIRED_COVER_SLOT, f);
                }}
              />
            </label>
          </div>
          {slotProgress(REQUIRED_COVER_SLOT)}
        </li>
      </ul>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Main audio (required — at least one)
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Upload <strong>radio edit</strong> and/or <strong>dirty / full version</strong>. You must
          include at least one of these two before submitting for review (both are welcome).
          Allowed: MP3, WAV, FLAC, M4A, AAC. DJs see downloads like{" "}
          <span className="font-mono text-[11px]">Make Way (Clean) - Artist.mp3</span> from your{" "}
          <strong>release title</strong> and <strong>credited artist</strong> in the form above, not from these file
          names.
        </p>
      </div>

      <ul className="space-y-4">
        {ESSENTIAL_AUDIO_SLOTS.map((slot) => (
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
                    {fileCaption(bySlot.get(slot))}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {!essentialMet
                      ? "Missing — need at least one radio or dirty track"
                      : "Not uploaded (optional if the other main file is set)"}
                  </p>
                )}
              </div>
              <label className="shrink-0">
                <span className="sr-only">Upload {PACK_SLOT_LABELS[slot]}</span>
                <input
                  type="file"
                  disabled={readOnly || slotPhase[slot] === "uploading"}
                  accept="audio/*"
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
          Additional pack files (optional)
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Instrumental and acapella are optional for submission.
        </p>
        <ul className="mt-3 space-y-4">
          {ADDITIONAL_PACK_SLOTS.map((slot) => (
            <li
              key={slot}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-sm font-medium">{PACK_SLOT_LABELS[slot]}</span>
                  {bySlot.get(slot) ? (
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {fileCaption(bySlot.get(slot))}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">Not uploaded</p>
                  )}
                </div>
                <label className="shrink-0">
                  <span className="sr-only">Upload {PACK_SLOT_LABELS[slot]}</span>
                  <input
                    type="file"
                    disabled={readOnly || slotPhase[slot] === "uploading"}
                    accept="audio/*"
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
      </div>

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
                      {fileCaption(bySlot.get(slot))}
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
        {submissionPackMet
          ? "Cover + main audio requirements met — ready to submit when metadata is complete."
          : [
              !coverMet ? "Upload cover artwork." : null,
              !essentialMet
                ? "Upload at least one of radio edit or dirty / full version."
                : null,
            ]
              .filter(Boolean)
              .join(" ") || null}
      </p>
    </div>
  );
}
