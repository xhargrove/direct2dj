"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateDjProfile } from "@/app/dj/actions";
import { DjAvatarUpload } from "@/components/dj/dj-avatar-upload";

export type DjProfileEditInitial = {
  display_name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
};

export function DjProfileEditForm({ initial }: { initial: DjProfileEditInitial }) {
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [stateRegion, setStateRegion] = useState(initial.state ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setMsg(null);
          const r = await updateDjProfile({
            display_name: displayName,
            bio: bio.trim() === "" ? null : bio,
            city: city.trim() === "" ? null : city.trim(),
            state: stateRegion.trim() === "" ? null : stateRegion.trim(),
          });
          if ("error" in r && r.error) setMsg(r.error);
          else setMsg("Saved.");
        });
      }}
    >
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">Profile photo</p>
        <DjAvatarUpload key={initial.avatar_url ?? "none"} initialAvatarUrl={initial.avatar_url} />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Display name</span>
        <span className="text-xs font-normal text-zinc-500">
          How you appear to artists and on your DJ profile.
        </span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={120}
          disabled={pending}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="nickname"
          className="mt-1 min-h-11 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Bio</span>
        <span className="text-xs font-normal text-zinc-500">Optional. Shown where your profile is visible.</span>
        <textarea
          rows={5}
          maxLength={2000}
          disabled={pending}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Tell artists about your sound, markets you play, etc."
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">City</span>
          <span className="text-xs font-normal text-zinc-500">
            Optional. Also used in aggregate analytics (see{" "}
            <Link href="/dj/settings" className="underline">
              Privacy
            </Link>
            ).
          </span>
          <input
            type="text"
            maxLength={120}
            disabled={pending}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            className="mt-1 min-h-11 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="e.g. Atlanta"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">State / region</span>
          <span className="text-xs font-normal text-zinc-500">Optional.</span>
          <input
            type="text"
            maxLength={120}
            disabled={pending}
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            autoComplete="address-level1"
            className="mt-1 min-h-11 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="e.g. GA"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
        <Link
          href="/dj/profile"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
        >
          Cancel
        </Link>
      </div>
      {msg ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p> : null}
    </form>
  );
}
