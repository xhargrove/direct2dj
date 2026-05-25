"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetUserRoleAndNotify, lookupProfileByEmail } from "@/app/admin/user-outreach/actions";
import { OUTREACH_PRESETS } from "@/lib/admin/outreach-presets";

type LookupResult = {
  profile: { id: string; email: string | null; full_name: string | null; role: string; created_at: string };
  dj: { id: string; display_name: string; vetting_status: string } | null;
  artist: { id: string; display_name: string } | null;
};

export function AdminUserLookupPanel({ selectedProfileId }: { selectedProfileId?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function onLookup(e: React.FormEvent) {
    e.preventDefault();
      setError(null);
      setMsg(null);
    setResult(null);
    startTransition(async () => {
      const r = await lookupProfileByEmail(email);
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      if ("ok" in r && r.ok) {
        setResult({ profile: r.profile, dj: r.dj, artist: r.artist });
      }
    });
  }

  function selectForMessage(profileId: string) {
    const params = new URLSearchParams();
    params.set("profile_id", profileId);
    params.set("audience", "single_profile");
    router.push(`/admin/user-outreach?${params.toString()}`);
  }

  function fixRoleAndNotify(role: "artist" | "dj") {
    if (!result) return;
    const preset =
      role === "dj" ? OUTREACH_PRESETS.wrong_role_artist : OUTREACH_PRESETS.wrong_role_dj;
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const r = await adminSetUserRoleAndNotify({
        profileId: result.profile.id,
        role,
        title: preset.title,
        body: preset.body,
        href: preset.href,
      });
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      setMsg(`Role updated to ${role} and notification sent.`);
      router.refresh();
    });
  }

  const active = result?.profile.id === selectedProfileId;

  return (
    <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Look up user by email</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Find accounts signed in as the wrong role, or pick a recipient for a one-off message.
      </p>

      <form onSubmit={onLookup} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dj@example.com"
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
        >
          {pending ? "Looking…" : "Look up"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {msg}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md border border-zinc-100 p-4 dark:border-zinc-800">
          <div className="text-sm font-medium">{result.profile.full_name?.trim() || result.profile.email}</div>
          <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd>{result.profile.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Account role</dt>
              <dd className="capitalize">{result.profile.role.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">DJ vetting</dt>
              <dd>{result.dj ? result.dj.vetting_status : "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">DJ display name</dt>
              <dd>{result.dj?.display_name ?? "—"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => selectForMessage(result.profile.id)}
              className={`min-h-10 rounded-md px-3 text-sm font-medium ${
                active
                  ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                  : "border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {active ? "Selected for message" : "Use as message recipient"}
            </button>
            {result.profile.role !== "dj" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => fixRoleAndNotify("dj")}
                className="min-h-10 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Switch to DJ + notify
              </button>
            ) : null}
            {result.profile.role !== "artist" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => fixRoleAndNotify("artist")}
                className="min-h-10 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
              >
                Switch to Artist + notify
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
