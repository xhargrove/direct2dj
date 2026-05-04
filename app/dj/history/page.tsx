import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Activity = {
  at: string;
  kind: string;
  label: string;
  href: string;
};

export default async function DjHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dj } = await supabase.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
  if (!dj) return <p className="text-sm text-red-600">No DJ profile.</p>;

  const djId = dj.id;

  const [downloads, plays, ratings, feedback] = await Promise.all([
    supabase
      .from("downloads")
      .select("id, created_at, tracks(id, title)")
      .eq("dj_id", djId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("play_reports")
      .select("id, created_at, play_count, tracks(id, title)")
      .eq("dj_id", djId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("ratings")
      .select("id, created_at, score, tracks(id, title)")
      .eq("dj_id", djId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("feedback")
      .select("id, created_at, body, tracks(id, title)")
      .eq("dj_id", djId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const activities: Activity[] = [];

  for (const r of downloads.data ?? []) {
    const t = r.tracks as { id?: string; title?: string } | null;
    activities.push({
      at: r.created_at,
      kind: "Download",
      label: t?.title ?? "Track",
      href: `/dj/tracks/${t?.id ?? ""}`,
    });
  }
  for (const r of plays.data ?? []) {
    const t = r.tracks as { id?: string; title?: string } | null;
    activities.push({
      at: r.created_at,
      kind: `Play (+${r.play_count})`,
      label: t?.title ?? "Track",
      href: `/dj/tracks/${t?.id ?? ""}`,
    });
  }
  for (const r of ratings.data ?? []) {
    const t = r.tracks as { id?: string; title?: string } | null;
    activities.push({
      at: r.created_at,
      kind: `Rated ${r.score}/5`,
      label: t?.title ?? "Track",
      href: `/dj/tracks/${t?.id ?? ""}`,
    });
  }
  for (const r of feedback.data ?? []) {
    const t = r.tracks as { id?: string; title?: string } | null;
    activities.push({
      at: r.created_at,
      kind: "Feedback",
      label: t?.title ?? "Track",
      href: `/dj/tracks/${t?.id ?? ""}`,
    });
  }

  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Downloads, reported plays, ratings, and feedback — newest first.
        </p>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No activity yet. Start in the{" "}
          <Link href="/dj/feed" className="underline underline-offset-4">
            feed
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {activities.slice(0, 80).map((a, i) => (
            <li key={`${a.kind}-${a.at}-${i}`} className="border-b border-zinc-100 pb-3 text-sm dark:border-zinc-800">
              <div className="text-xs text-zinc-500">{new Date(a.at).toLocaleString()}</div>
              <Link href={a.href} className="font-medium underline-offset-4 hover:underline">
                {a.label}
              </Link>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{a.kind}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
