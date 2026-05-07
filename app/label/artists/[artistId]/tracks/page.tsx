import Link from "next/link";
import { notFound } from "next/navigation";
import { labelRepCreateDraftFromForm } from "@/app/label/actions";
import { createClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/auth/require-role";

type Props = {
  params: Promise<{ artistId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function LabelArtistTracksPage({ params, searchParams }: Props) {
  await requireRoles(["label_rep"]);
  const { artistId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, display_name")
    .eq("id", artistId)
    .eq("managed_by_label_rep_id", user.id)
    .maybeSingle();

  if (!artist) notFound();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, title, moderation_status, is_draft, label_roster_release, created_at")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/label/roster" className="text-zinc-600 underline dark:text-zinc-400">
          ← Roster
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{artist.display_name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          DJ packs for this roster act. Submit for review when metadata and files are complete; admins approve before DJs
          see the release (label roster badge in Discover).
        </p>
      </div>

      {sp.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {sp.error}
        </p>
      ) : null}

      <form action={labelRepCreateDraftFromForm} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="artist_id" value={artistId} />
        <button
          type="submit"
          className="min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New DJ pack draft
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Packs</h2>
        {(tracks ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No packs yet — create a draft to upload audio and artwork.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {(tracks ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-zinc-500">
                    {t.moderation_status}
                    {t.is_draft ? " · draft" : ""}
                    {t.label_roster_release ? " · label roster" : ""}
                  </div>
                </div>
                <Link
                  href={`/label/artists/${artistId}/tracks/${t.id}/edit`}
                  className="underline underline-offset-4"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
