"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AVATAR_PATH_SUFFIX = "avatar";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function DjAvatarUpload({
  initialAvatarUrl,
}: {
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(initialAvatarUrl);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const storagePathForUser = useCallback((userId: string) => `${userId}/${AVATAR_PATH_SUFFIX}`, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      setStatus(null);
      if (!file) return;

      if (!ACCEPT_MIME.has(file.type)) {
        setStatus("Use a JPEG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setStatus("Image must be 5 MB or smaller.");
        return;
      }

      setBusy(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Sign in required.");
        setBusy(false);
        return;
      }

      const path = storagePathForUser(user.id);
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (upErr) {
        setStatus(upErr.message);
        setBusy(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: profileErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);

      if (profileErr) {
        setStatus(profileErr.message);
        setBusy(false);
        return;
      }

      setPreview(publicUrl);
      setStatus("Photo updated.");
      setBusy(false);
      router.refresh();
    },
    [router, storagePathForUser],
  );

  const removePhoto = useCallback(async () => {
    setStatus(null);
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("Sign in required.");
      setBusy(false);
      return;
    }

    await supabase.storage.from("avatars").remove([storagePathForUser(user.id)]);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    if (error) {
      setStatus(error.message);
      setBusy(false);
      return;
    }
    setPreview(null);
    setStatus("Photo removed.");
    setBusy(false);
    router.refresh();
  }, [router, storagePathForUser]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded dynamic URL from Supabase public bucket
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
            No photo
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-950">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void handleFile(f);
                e.target.value = "";
              }}
            />
            {busy ? "Working…" : "Upload photo"}
          </label>
          {(preview || initialAvatarUrl) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void removePhoto()}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          JPEG, PNG, WebP, or GIF. Max 5 MB. Shown on your DJ profile and when artists you’ve interacted with view your
          profile.
        </p>
        {status ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p> : null}
      </div>
    </div>
  );
}
