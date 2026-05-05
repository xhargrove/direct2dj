import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function AdminArtistProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: artist, error: aErr } = await supabase
    .from("artists")
    .select(
      `
      id,
      display_name,
      bio,
      status,
      created_at,
      profile_id,
      profiles ( id, email, full_name, created_at )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (aErr || !artist) {
    notFound();
  }

  const raw = artist as unknown as {
    id: string;
    display_name: string;
    bio: string | null;
    status: string;
    created_at: string;
    profile_id: string;
    profiles:
      | { id: string; email: string | null; full_name: string | null; created_at: string }
      | { id: string; email: string | null; full_name: string | null; created_at: string }[]
      | null;
  };
  const p = Array.isArray(raw.profiles) ? raw.profiles[0] ?? null : raw.profiles;

  const { count: trackCount } = await supabase
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("artist_id", id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/artists"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          ← Artists
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{raw.display_name}</h1>
        <p className="text-sm text-zinc-500">Status: {raw.status}</p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Name</dt>
            <dd>{p?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Email</dt>
            <dd>{p?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Profile since</dt>
            <dd>{p?.created_at ? formatDateTimeDisplay(p.created_at) : "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Bio</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {raw.bio ?? "—"}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Tracks</h2>
        <p className="mt-2 text-2xl font-semibold">{trackCount ?? 0}</p>
        <p className="text-xs text-zinc-500">Total track rows for this artist.</p>
      </section>
    </div>
  );
}
