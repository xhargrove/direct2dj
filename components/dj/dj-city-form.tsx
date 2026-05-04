"use client";

import { useState, useTransition } from "react";
import { updateDjCity } from "@/app/dj/actions";

export function DjCityForm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setMsg(null);
          const r = await updateDjCity(value.trim());
          if ("error" in r && r.error) setMsg(r.error);
          else setMsg("Saved.");
        });
      }}
    >
      <div>
        <label htmlFor="dj-city" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          City (optional)
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Used only for anonymous city breakdowns in artist analytics when provided. You can leave this blank.
        </p>
        <input
          id="dj-city"
          type="text"
          autoComplete="address-level2"
          disabled={pending}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-2 w-full min-h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="e.g. Atlanta"
          maxLength={120}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save city"}
      </button>
      {msg ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p> : null}
    </form>
  );
}
