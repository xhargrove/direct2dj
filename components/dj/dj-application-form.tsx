"use client";

import { useActionState } from "react";
import { submitDjApplication } from "@/app/dj/apply/actions";

function s(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function b(v: unknown): boolean | undefined {
  if (v === true) return true;
  if (v === false) return false;
  return undefined;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const x = parseInt(v, 10);
    if (Number.isFinite(x)) return x;
  }
  return fallback;
}

const ynOptions = (
  <>
    <option value="">Choose…</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </>
);

export function DjApplicationForm({
  defaultEmail,
  existing,
}: {
  defaultEmail: string;
  existing: Record<string, unknown> | null;
}) {
  const [state, formAction, pending] = useActionState(submitDjApplication, null);

  const e = existing ?? {};
  const playsClubs = b(e.plays_clubs);
  const playsRadio = b(e.plays_radio);
  const breaksNew = b(e.breaks_new_records);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">DJ name</span>
          <input
            name="dj_name"
            required
            minLength={2}
            defaultValue={s(e.dj_name)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={s(e.email) || defaultEmail}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">City</span>
          <input
            name="city"
            required
            defaultValue={s(e.city)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">State / region</span>
          <input
            name="state"
            required
            defaultValue={s(e.state)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Phone</span>
          <input
            name="phone"
            type="tel"
            required
            minLength={7}
            defaultValue={s(e.phone)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Instagram</span>
          <input
            name="instagram"
            placeholder="@handle or URL"
            defaultValue={s(e.instagram)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Mixcloud / SoundCloud</span>
          <input
            name="mixcloud_soundcloud_url"
            type="url"
            placeholder="https://…"
            defaultValue={s(e.mixcloud_soundcloud_url)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Club / radio affiliation</span>
        <textarea
          name="club_radio_affiliation"
          rows={3}
          defaultValue={s(e.club_radio_affiliation)}
          className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Residencies, stations, crews…"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Years DJing</span>
          <input
            name="years_djing"
            type="number"
            min={0}
            max={80}
            required
            defaultValue={num(e.years_djing, 0)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Average crowd size</span>
          <input
            name="avg_crowd_size"
            required
            placeholder="e.g. 50–150"
            defaultValue={s(e.avg_crowd_size)}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Primary genres</span>
        <textarea
          name="primary_genres"
          rows={2}
          required
          minLength={2}
          defaultValue={s(e.primary_genres)}
          className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="House, amapiano, open format…"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Do you play clubs?</span>
          <select
            name="plays_clubs"
            required
            defaultValue={playsClubs === true ? "yes" : playsClubs === false ? "no" : ""}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {ynOptions}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Do you play radio?</span>
          <select
            name="plays_radio"
            required
            defaultValue={playsRadio === true ? "yes" : playsRadio === false ? "no" : ""}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {ynOptions}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Do you break new records?</span>
          <select
            name="breaks_new_records"
            required
            defaultValue={breaksNew === true ? "yes" : breaksNew === false ? "no" : ""}
            className="min-h-11 rounded-md border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {ynOptions}
          </select>
        </label>
      </div>

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
