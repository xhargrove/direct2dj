import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminArtistEditForm } from "@/components/admin/admin-artist-edit-form";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import { createClient } from "@/lib/supabase/server";
import type { LifecycleStatus } from "@/lib/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function AdminArtistProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: artist, error: aErr } = await supabase
    .from("artists")
    .select(
      "id, display_name, bio, status, created_at, profile_id, managed_by_label_rep_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (aErr || !artist) {
    notFound();
  }

  const row = artist as {
    id: string;
    display_name: string;
    bio: string | null;
    status: LifecycleStatus;
    created_at: string;
    profile_id: string | null;
    managed_by_label_rep_id: string | null;
  };

  const [{ data: indieProfile }, { data: labelManagerProfile }] = await Promise.all([
    row.profile_id
      ? supabase.from("profiles").select("email, full_name, created_at").eq("id", row.profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.managed_by_label_rep_id
      ? supabase.from("profiles").select("email, full_name").eq("id", row.managed_by_label_rep_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { count: trackCount } = await supabase
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("artist_id", id);

  const isLabelRoster = Boolean(row.managed_by_label_rep_id) && !row.profile_id;
  const hasIndieLogin = Boolean(row.profile_id);

  let workspaceBadge: string;
  if (hasIndieLogin && row.managed_by_label_rep_id) {
    workspaceBadge = "Indie artist login + label association";
  } else if (isLabelRoster) {
    workspaceBadge = "Label-managed roster — no separate artist login";
  } else if (hasIndieLogin) {
    workspaceBadge = "Indie artist — own login";
  } else {
    workspaceBadge = "Artist row";
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/artists"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          ← Artists
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{row.display_name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Catalog status: {row.status}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{workspaceBadge}</p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Artist details (admin)</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Editable catalog identity for this artist — applies to submissions, DJ discovery, and admin review.
        </p>
        <div className="mt-4">
          <AdminArtistEditForm
            artistId={row.id}
            initial={{
              display_name: row.display_name,
              bio: row.bio,
              status: row.status === "inactive" ? "inactive" : "active",
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Accounts & ownership</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Read-only context — who logs in vs who manages a label roster act.
        </p>

        {hasIndieLogin ? (
          <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Artist login</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Name</dt>
                <dd>{indieProfile?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Email</dt>
                <dd>{indieProfile?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Profile since</dt>
                <dd>{indieProfile?.created_at ? formatDateTimeDisplay(indieProfile.created_at) : "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {row.managed_by_label_rep_id ? (
          <div className={`mt-4 ${hasIndieLogin ? "border-t border-zinc-100 pt-4 dark:border-zinc-800" : ""}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Label rep (manager)</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Name</dt>
                <dd>{labelManagerProfile?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Email</dt>
                <dd>{labelManagerProfile?.email ?? "—"}</dd>
              </div>
            </dl>
            {!hasIndieLogin ? (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                This act does not have its own Digital Service Pack login. Packs and uploads go through label/admin
                workflows; use{" "}
                <Link href="/admin/tracks" className="underline">
                  Admin → Tracks
                </Link>{" "}
                for submissions tied to this artist.
              </p>
            ) : null}
          </div>
        ) : null}

        {!hasIndieLogin && !row.managed_by_label_rep_id ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No linked login profile or label manager on file for this row.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Tracks</h2>
        <p className="mt-2 text-2xl font-semibold">{trackCount ?? 0}</p>
        <p className="text-xs text-zinc-500">Total track rows for this artist.</p>
      </section>
    </div>
  );
}
