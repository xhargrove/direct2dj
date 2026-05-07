"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminUpdateArtist } from "@/app/admin/actions";

export type AdminArtistEditInitial = {
  display_name: string;
  bio: string | null;
  status: "active" | "inactive";
};

export function AdminArtistEditForm({ artistId, initial }: { artistId: string; initial: AdminArtistEditInitial }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(initial.status);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
          setMsg(null);
          const r = await adminUpdateArtist(artistId, {
            display_name: displayName,
            bio: bio.trim() === "" ? null : bio,
            status,
          });
          if ("error" in r && r.error) setMsg(r.error);
          else {
            setMsg("Saved.");
            router.refresh();
          }
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Display name</span>
        <span className="text-xs font-normal text-zinc-500">
          Promo / catalog name — editable by admins for any artist type.
        </span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={120}
          disabled={pending}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 min-h-11 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Bio</span>
        <textarea
          rows={5}
          maxLength={2000}
          disabled={pending}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Lifecycle status</span>
        <select
          disabled={pending}
          value={status}
          onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
          className="mt-1 min-h-11 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {msg ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p> : null}
    </form>
  );
}
