"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendDjAnnouncementAction } from "@/app/admin/communications/actions";

export type DjOption = {
  id: string;
  display_name: string;
  vetting_status: string;
};

type Props = {
  djs: DjOption[];
  initialTargetDjId?: string | null;
};

export function AdminCommunicationsForm({ djs, initialTargetDjId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<"all_approved_djs" | "single_dj">(
    initialTargetDjId ? "single_dj" : "all_approved_djs",
  );
  const [targetDjId, setTargetDjId] = useState(initialTargetDjId ?? "");
  const [feedback, setFeedback] = useState<{ text: string; variant: "ok" | "error" } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("audience", audience);
    if (audience === "single_dj") {
      fd.set("target_dj_id", targetDjId);
    }

    startTransition(async () => {
      const r = await sendDjAnnouncementAction(fd);
      if ("error" in r && r.error) {
        setFeedback({ text: r.error, variant: "error" });
        return;
      }
      if ("ok" in r && r.ok) {
        setFeedback({
          text: `Sent to ${r.recipientCount} DJ${r.recipientCount === 1 ? "" : "s"}. They will see it in their notification bell.`,
          variant: "ok",
        });
        form.reset();
        setAudience(initialTargetDjId ? "single_dj" : "all_approved_djs");
        setTargetDjId(initialTargetDjId ?? "");
        router.refresh();
      }
    });
  }

  const approvedCount = djs.filter((d) => d.vetting_status === "approved").length;

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Audience</legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="audience_ui"
            checked={audience === "all_approved_djs"}
            onChange={() => setAudience("all_approved_djs")}
            className="mt-1"
          />
          <span>
            All approved DJs
            <span className="block text-xs text-zinc-500">
              {approvedCount} recipient{approvedCount === 1 ? "" : "s"} with promo access
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="audience_ui"
            checked={audience === "single_dj"}
            onChange={() => setAudience("single_dj")}
            className="mt-1"
          />
          <span>One DJ</span>
        </label>
        {audience === "single_dj" ? (
          <label className="block space-y-1 pl-6">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">DJ</span>
            <select
              required
              value={targetDjId}
              onChange={(e) => setTargetDjId(e.target.value)}
              className="min-h-11 w-full max-w-md rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="">Select a DJ…</option>
              {djs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.display_name} ({d.vetting_status})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Title</span>
        <input
          name="title"
          required
          maxLength={120}
          placeholder="e.g. New promos in Discover this week"
          className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Message</span>
        <textarea
          name="body"
          rows={4}
          maxLength={2000}
          placeholder="Optional details for the DJ inbox…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Link (optional)</span>
        <input
          name="href"
          type="text"
          placeholder="/dj/feed"
          className="min-h-11 w-full max-w-md rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
        <p className="text-xs text-zinc-500">In-app path only, starting with /. DJs can tap the notification to open it.</p>
      </label>

      {feedback ? (
        <p
          className={
            feedback.variant === "ok"
              ? "text-sm text-emerald-700 dark:text-emerald-300"
              : "text-sm text-red-600 dark:text-red-400"
          }
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Sending…" : "Send in-app message"}
      </button>
    </form>
  );
}
