import Link from "next/link";
import { createManagedArtistFromForm } from "@/app/label/actions";
import { createClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/auth/require-role";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LabelRosterPage({ searchParams }: Props) {
  await requireRoles(["label_rep"]);
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: rows } = await supabase
    .from("artists")
    .select("id, display_name, created_at")
    .eq("managed_by_label_rep_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roster artists</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create an artist page, then add DJ packs for admin review. These acts do not sign in as indie artists.
        </p>
      </div>

      {sp.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {sp.error}
        </p>
      ) : null}

      <form action={createManagedArtistFromForm} className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="space-y-1">
          <span className="text-sm font-medium">New roster artist</span>
          <input
            name="display_name"
            required
            placeholder="Artist or project name"
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 w-fit rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Create and open packs
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your roster</h2>
        {(rows ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No roster artists yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {(rows ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{a.display_name}</span>
                <Link href={`/label/artists/${a.id}/tracks`} className="underline underline-offset-4">
                  Manage packs
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
