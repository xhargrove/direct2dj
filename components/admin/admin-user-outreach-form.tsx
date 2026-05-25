"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendUserOutreachAction } from "@/app/admin/user-outreach/actions";
import { OUTREACH_PRESETS, type OutreachPresetKey } from "@/lib/admin/outreach-presets";

export type DjOption = {
  id: string;
  display_name: string;
  vetting_status: string;
  profile_id: string;
  email: string | null;
};

type Audience = "pending_djs" | "all_approved_djs" | "single_dj" | "single_profile";

type Props = {
  djs: DjOption[];
  pendingCount: number;
  approvedCount: number;
  emailConfigured: boolean;
  initialTargetDjId?: string | null;
  initialTargetProfileId?: string | null;
  initialAudience?: Audience | null;
};

export function AdminUserOutreachForm({
  djs,
  pendingCount,
  approvedCount,
  emailConfigured,
  initialTargetDjId,
  initialTargetProfileId,
  initialAudience,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<Audience>(
    initialAudience ?? (initialTargetProfileId ? "single_profile" : initialTargetDjId ? "single_dj" : "pending_djs"),
  );
  const [targetDjId, setTargetDjId] = useState(initialTargetDjId ?? "");
  const targetProfileId = initialTargetProfileId ?? "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; variant: "ok" | "error" } | null>(null);

  function applyPreset(key: OutreachPresetKey) {
    const p = OUTREACH_PRESETS[key];
    setTitle(p.title);
    setBody(p.body);
    setHref(p.href);
    if (p.audience === "pending_djs") {
      setAudience("pending_djs");
    } else {
      setAudience("single_profile");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData();
    fd.set("audience", audience);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("href", href);
    if (audience === "single_dj") fd.set("target_dj_id", targetDjId);
    if (audience === "single_profile") fd.set("target_profile_id", targetProfileId);

    startTransition(async () => {
      const r = await sendUserOutreachAction(fd);
      if ("error" in r && r.error) {
        setFeedback({ text: r.error, variant: "error" });
        return;
      }
      if ("ok" in r && r.ok) {
        const emailNote = emailConfigured
          ? " In-app notification and email (when the address is on file)."
          : " In-app notification only — add RESEND_API_KEY or SendGrid/Postmark to also send email.";
        setFeedback({
          text: `Sent to ${r.recipientCount} user${r.recipientCount === 1 ? "" : "s"}.${emailNote}`,
          variant: "ok",
        });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Message templates</h2>
        <p className="mt-1 text-xs text-zinc-500">Quick-fill for common situations. Edit before sending.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(OUTREACH_PRESETS) as OutreachPresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
              onClick={() => applyPreset(key)}
            >
              {OUTREACH_PRESETS[key].label}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Audience</legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            checked={audience === "pending_djs"}
            onChange={() => setAudience("pending_djs")}
            className="mt-1"
          />
          <span>
            All pending DJ applications
            <span className="block text-xs text-zinc-500">
              {pendingCount} DJ{pendingCount === 1 ? "" : "s"} waiting for review
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            checked={audience === "all_approved_djs"}
            onChange={() => setAudience("all_approved_djs")}
            className="mt-1"
          />
          <span>
            All approved DJs
            <span className="block text-xs text-zinc-500">{approvedCount} recipients</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            checked={audience === "single_dj"}
            onChange={() => setAudience("single_dj")}
            className="mt-1"
          />
          <span>One DJ (by profile)</span>
        </label>
        {audience === "single_dj" ? (
          <select
            required
            value={targetDjId}
            onChange={(e) => setTargetDjId(e.target.value)}
            className="min-h-11 w-full max-w-md rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="">Select a DJ…</option>
            {djs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name} ({d.vetting_status}){d.email ? ` · ${d.email}` : ""}
              </option>
            ))}
          </select>
        ) : null}
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            checked={audience === "single_profile"}
            onChange={() => setAudience("single_profile")}
            className="mt-1"
          />
          <span>One user (use lookup below — profile id is filled automatically)</span>
        </label>
        {audience === "single_profile" ? (
          <input type="hidden" name="target_profile_id" value={targetProfileId} />
        ) : null}
        {audience === "single_profile" && !targetProfileId ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Look up a user by email below first, then send your message.
          </p>
        ) : null}
        {audience === "single_profile" && targetProfileId ? (
          <p className="text-xs text-zinc-500">Recipient profile id: {targetProfileId}</p>
        ) : null}
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Title</span>
        <input
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Message</span>
        <textarea
          rows={5}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Link (optional)</span>
        <input
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="/dj/application-status"
          className="min-h-11 w-full max-w-md rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
        <p className="text-xs text-zinc-500">In-app path starting with /. Included in notification and email.</p>
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
        disabled={pending || (audience === "single_profile" && !targetProfileId)}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
