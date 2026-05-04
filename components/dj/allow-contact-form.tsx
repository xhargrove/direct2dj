"use client";

import { useState, useTransition } from "react";
import { updateAllowArtistContact } from "@/app/dj/actions";

export function AllowContactForm({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          className="mt-1"
          onChange={(e) => {
            const next = e.target.checked;
            setChecked(next);
            startTransition(async () => {
              setMsg(null);
              const r = await updateAllowArtistContact(next);
              if ("error" in r && r.error) setMsg(r.error);
              else setMsg(next ? "Artists can see your DJ display name on analytics." : "Artists see an anonymized label.");
            });
          }}
        />
        <span className="text-sm leading-relaxed">
          Allow artists to see my DJ display name on ratings and feedback analytics (instead of an anonymized label).
        </span>
      </label>
      {msg ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p> : null}
    </div>
  );
}
