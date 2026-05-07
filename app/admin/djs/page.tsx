import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  display_name: string;
  status: string;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | null;
};

export default async function AdminDjsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("djs")
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
    return <div className="text-sm text-red-600">Could not load DJs: {error.message}</div>;
  }

  const list = (rows ?? []) as unknown as Row[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJs</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{list.length}</span>{" "}
          {list.length === 1 ? "DJ signed up" : "DJs signed up"}
          <span className="text-zinc-500 dark:text-zinc-400"> · Registered DJ profiles in this workspace.</span>
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {list.map((d) => (
          <li
            key={d.id}
            className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div className="font-medium">{d.display_name}</div>
            <div className="text-xs text-zinc-500">
              {d.profiles?.full_name ?? d.profiles?.email ?? "—"} · {d.status}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Per-track engagement is on each track’s admin page (downloads, plays, ratings, feedback).
            </p>
          </li>
        ))}
      </ul>
      {list.length === 0 ? <p className="text-sm text-zinc-500">No DJs.</p> : null}
    </div>
  );
}
