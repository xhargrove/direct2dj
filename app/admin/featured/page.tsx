import Link from "next/link";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  track_id: string;
  label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  moderation_status: string;
  tracks: { id: string; title: string } | null;
};

export default async function AdminFeaturedPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("featured_placements")
    .select(
      `
      id,
      track_id,
      label,
      starts_at,
      ends_at,
      moderation_status,
      tracks ( id, title )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-sm text-red-600">Could not load placements: {error.message}</div>;
  }

  const list = (rows ?? []) as unknown as Row[];
  const now = Date.now(); // eslint-disable-line react-hooks/purity -- server-only page snapshot

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Featured placements</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          DJs only see placements that are approved and within the active window (starts ≤ now ≤ ends;
          NULL ends = open-ended).
          Past end date, rows remain here for history but drop off the DJ catalog automatically.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Track</th>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Window</th>
              <th className="px-3 py-2 font-medium">DJ-visible</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const s = r.starts_at ? new Date(r.starts_at).getTime() : -Infinity;
              const e = r.ends_at ? new Date(r.ends_at).getTime() : Infinity;
              const inWindow =
                r.moderation_status === "approved" && s <= now && e >= now;
              return (
                <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/tracks/${r.track_id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {r.tracks?.title ?? r.track_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.label ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.starts_at ? formatDateTimeDisplay(r.starts_at) : "open"} →{" "}
                    {r.ends_at ? formatDateTimeDisplay(r.ends_at) : "open"}
                  </td>
                  <td className="px-3 py-2">
                    {inWindow ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                        Live
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700">Off-air</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {list.length === 0 ? <p className="text-sm text-zinc-500">No featured placements yet.</p> : null}
    </div>
  );
}
