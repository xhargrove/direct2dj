import Link from "next/link";
import { PaidAwaitingUploadLink } from "@/components/admin/paid-awaiting-upload-link";
import { primaryReleaseArtistLabel, workspaceArtistNote } from "@/lib/admin/track-artist-labels";
import { loadPaidAwaitingUploadRows } from "@/lib/admin/paid-awaiting-upload";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
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

  const [{ data: rows, error }, paidAwaiting] = await Promise.all([
    supabase
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
      .order("created_at", { ascending: false }),
    loadPaidAwaitingUploadRows(supabase),
  ]);

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Could not load submissions: {error.message}
      </div>
    );
  }

  const list = (rows ?? []) as unknown as Row[];
  const awaiting = paidAwaiting.rows;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Review queues for artist packs. Payment alone does not create a pending submission — the artist must
          submit for review after upload.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          <Link href="/admin/payments" className="font-medium underline">
            Payment reconciliation
          </Link>{" "}
          ·{" "}
          <Link href="/admin/system" className="font-medium underline">
            System health
          </Link>
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Paid — awaiting upload</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Succeeded submission fees with draft packs not yet submitted for review ({awaiting.length}).
          </p>
        </div>

        {paidAwaiting.error ? (
          <p className="text-sm text-red-600">{paidAwaiting.error}</p>
        ) : awaiting.length === 0 ? (
          <p className="text-sm text-zinc-500">No paid drafts awaiting upload.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {awaiting.map((r) => (
              <li
                key={r.paymentId}
                className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20"
              >
                <div className="font-medium">{r.trackTitle}</div>
                <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{r.artistName}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {r.planLabel} · Paid {formatDateTimeDisplay(r.paidAt)} · {r.fileCount} file
                  {r.fileCount === 1 ? "" : "s"}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link
                    href={`/admin/tracks/${r.trackId}`}
                    className="text-sm font-medium underline"
                  >
                    Admin review
                  </Link>
                  <PaidAwaitingUploadLink url={r.artistEditUrl} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Pending submissions</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
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
                    <div className="mt-1 text-xs text-zinc-500">{formatDateTimeDisplay(r.created_at)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
