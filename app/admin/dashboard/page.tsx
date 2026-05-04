import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: pendingSubmissions }, { count: totalTracks }, { data: featuredRows }] =
    await Promise.all([
      supabase
        .from("tracks")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "pending")
        .eq("is_draft", false),
      supabase.from("tracks").select("*", { count: "exact", head: true }),
      supabase
        .from("featured_placements")
        .select("starts_at, ends_at, moderation_status")
        .eq("moderation_status", "approved"),
    ]);

  // Request-time snapshot for featured window display (not cache-revalidated UI).
  const now = Date.now(); // eslint-disable-line react-hooks/purity -- server-only page snapshot
  const liveFeatured = (featuredRows ?? []).filter((p) => {
    const s = p.starts_at ? new Date(p.starts_at).getTime() : -Infinity;
    const e = p.ends_at ? new Date(p.ends_at).getTime() : Infinity;
    return s <= now && e >= now;
  }).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Review submissions, manage catalog visibility, featured placements, and tags.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/submissions"
          className="rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <div className="text-3xl font-semibold">{pendingSubmissions ?? 0}</div>
          <div className="text-xs text-zinc-500">Pending submissions</div>
        </Link>
        <Link
          href="/admin/tracks"
          className="rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <div className="text-3xl font-semibold">{totalTracks ?? 0}</div>
          <div className="text-xs text-zinc-500">Tracks</div>
        </Link>
        <Link
          href="/admin/featured"
          className="rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <div className="text-3xl font-semibold">{liveFeatured ?? 0}</div>
          <div className="text-xs text-zinc-500">Live featured (in window)</div>
        </Link>
      </div>

      <p className="text-xs text-zinc-500">
        Approved featured rows total: {featuredRows?.length ?? 0} (live window uses starts/ends).
      </p>
    </div>
  );
}
