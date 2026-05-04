import Link from "next/link";
import { VerifyPlayReportButton } from "@/components/admin/verify-play-report-button";
import { createClient } from "@/lib/supabase/server";
import type { PlayReportVerification } from "@/lib/types/database";

export default async function AdminPlayReportsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("play_reports")
    .select(
      `
      id,
      played_at,
      venue_name,
      city,
      state,
      event_name,
      estimated_crowd_size,
      crowd_reaction,
      notes,
      proof_url,
      verification_status,
      created_at,
      tracks ( id, title ),
      djs ( id, display_name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return <p className="text-sm text-red-600">Could not load play reports: {error.message}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Play reports</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Review DJ-submitted plays. Mark a report verified only after you confirm it; self-reported
          plays are not treated as verified by default.
        </p>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No play reports yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-3 font-medium">Track</th>
                <th className="py-2 pr-3 font-medium">DJ</th>
                <th className="py-2 pr-3 font-medium">When / where</th>
                <th className="py-2 pr-3 font-medium">Crowd</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = r.tracks as { id?: string; title?: string } | null;
                const d = r.djs as { id?: string; display_name?: string } | null;
                const v = r.verification_status as PlayReportVerification;
                return (
                  <tr key={r.id} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                    <td className="py-3 pr-3">
                      {t?.id ? (
                        <Link
                          href={`/admin/tracks/${t.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {t.title ?? "—"}
                        </Link>
                      ) : (
                        <span>{t?.title ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">{d?.display_name ?? "—"}</td>
                    <td className="py-3 pr-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <div>{r.played_at}</div>
                      <div>
                        {r.venue_name}
                        {r.city ? `, ${r.city}` : ""}
                        {r.state ? `, ${r.state}` : ""}
                      </div>
                      <div className="mt-0.5">{r.event_name}</div>
                      {r.notes ? <div className="mt-1 max-w-[14rem]">{r.notes}</div> : null}
                      {r.proof_url ? (
                        <a
                          href={r.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-zinc-800 underline dark:text-zinc-200"
                        >
                          Proof
                        </a>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {r.estimated_crowd_size}
                      {r.crowd_reaction ? (
                        <div className="text-zinc-500">{String(r.crowd_reaction).replace("_", " ")}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      {v === "verified" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-900 dark:bg-green-950 dark:text-green-200">
                          Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Self-reported
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-0 text-right">
                      {v === "verified" ? (
                        <span className="text-xs text-zinc-400">—</span>
                      ) : (
                        <VerifyPlayReportButton playReportId={r.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
