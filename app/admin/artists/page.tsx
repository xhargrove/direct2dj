import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  display_name: string;
  status: string;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | null;
};

export default async function AdminArtistsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("artists")
    .select(
      `
      id,
      display_name,
      status,
      created_at,
      profiles ( email, full_name )
    `,
    )
    .order("display_name", { ascending: true });

  if (error) {
    return <div className="text-sm text-red-600">Could not load artists: {error.message}</div>;
  }

  const list = (rows ?? []) as unknown as Row[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artists</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Linked accounts and lifecycle status.</p>
      </div>

      <ul className="flex flex-col gap-2">
        {list.map((a) => (
          <li key={a.id}>
            <Link
              href={`/admin/artists/${a.id}`}
              className="block rounded-lg border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <div className="font-medium">{a.display_name}</div>
              <div className="text-xs text-zinc-500">
                {a.profiles?.full_name ?? a.profiles?.email ?? "—"} · {a.status}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 ? <p className="text-sm text-zinc-500">No artists.</p> : null}
    </div>
  );
}
