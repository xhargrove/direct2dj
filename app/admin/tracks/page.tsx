import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  title: string;
  moderation_status: string;
  is_draft: boolean;
  catalog_active: boolean;
  created_at: string;
  artists: { display_name: string } | null;
};

export default async function AdminTracksPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      moderation_status,
      is_draft,
      catalog_active,
      created_at,
      artists ( display_name )
    `,
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return <div className="text-sm text-red-600">Could not load tracks: {error.message}</div>;
  }

  const list = (rows ?? []) as unknown as Row[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tracks</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Full catalog — open a track to review, moderate, feature, or hide.
          </p>
        </div>
        <Link
          href="/admin/tracks/new"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          New track (no fee)
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Artist</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Catalog</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <Link href={`/admin/tracks/${r.id}`} className="font-medium underline underline-offset-4">
                    {r.title}
                  </Link>
                  {r.is_draft ? (
                    <span className="ml-2 text-xs text-zinc-500">draft</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.artists?.display_name ?? "—"}</td>
                <td className="px-3 py-2">{r.moderation_status}</td>
                <td className="px-3 py-2">{r.catalog_active === false ? "hidden" : "live"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 ? <p className="text-sm text-zinc-500">No tracks.</p> : null}
    </div>
  );
}
