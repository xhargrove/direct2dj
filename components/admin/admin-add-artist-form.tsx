"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreateArtistAccount } from "@/app/admin/actions";

export function AdminAddArtistForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [mode, setMode] = useState<"invite" | "create_confirmed">("invite");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const r = await adminCreateArtistAccount({
      email: email.trim(),
      displayName: displayName.trim(),
      profileFullName: profileFullName.trim() || undefined,
      mode,
    });

    setPending(false);

    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }

    const msg = "message" in r ? r.message : undefined;
    setSuccess(typeof msg === "string" ? msg : "Artist account created.");
    setEmail("");
    setDisplayName("");
    setProfileFullName("");
    router.refresh();
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add artist account</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Creates a separate login from your admin account. The artist display name is what appears on promos and
          listings; it can differ from the person&apos;s profile name or email.
        </p>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Email (login)</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="artist@example.com"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Artist display name</span>
        <input
          type="text"
          name="display_name"
          required
          value={displayName}
          onChange={(ev) => setDisplayName(ev.target.value)}
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Stage or project name"
        />
        <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
          Public-facing name for this artist (does not have to match your admin name).
        </span>
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Profile full name (optional)</span>
        <input
          type="text"
          name="profile_full_name"
          value={profileFullName}
          onChange={(ev) => setProfileFullName(ev.target.value)}
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Legal or billing name"
        />
        <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
          Stored on the account profile; defaults to the display name if left blank.
        </span>
      </label>

      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium text-zinc-900 dark:text-zinc-100">How to create the account</legend>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "invite"}
            onChange={() => setMode("invite")}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Send invite email</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              User receives a link to set their password (requires Supabase Auth email / SMTP).
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "create_confirmed"}
            onChange={() => setMode("create_confirmed")}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Create confirmed account (no invite)</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Email is pre-confirmed. User should use Forgot password on the login page to sign in the first time.
            </span>
          </span>
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Creating…" : "Create artist account"}
      </button>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          {success}
        </p>
      ) : null}
    </form>
  );
}
