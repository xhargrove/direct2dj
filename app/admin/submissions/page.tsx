import Link from "next/link";
import { primaryReleaseArtistLabel, workspaceArtistNote } from "@/lib/admin/track-artist-labels";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  title: string;
  created_at: string;
  credit_artist_name: string;
  artist_id: string;
  artists: { display_name: string } | null;
};

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      created_at,
      credit_artist_name,
      artist_id,
      artists ( display_name )
    `,
    )
    .eq("moderation_status", "pending")
    .eq("is_draft", false)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Could not load submissions: {error.message}
      </div>
    );
  }

  const list = (rows ?? []) as unknown as Row[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pending submissions</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Submitted tracks awaiting review (non-draft, status pending).
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-zinc-500">No pending submissions.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => {
            const workspace = workspaceArtistNote(r.credit_artist_name, r.artists?.display_name);
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/submissions/${r.id}`}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <div className="font-medium">{r.title}</div>
                  <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                    {primaryReleaseArtistLabel(r.credit_artist_name, r.artists?.display_name)}
                  </div>
                  {workspace ? (
                    <div className="text-xs text-zinc-500">Account: {workspace}</div>
                  ) : null}
                  <div className="mt-1 text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
