import { createClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/auth/require-role";

export default async function LabelCatalogOverviewPage() {
  await requireRoles(["label_rep"]);
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      moderation_status,
      is_draft,
      label_roster_release,
      created_at,
      artists ( display_name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site catalog overview</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Read-only snapshot of recent packs on the platform (including other labels and indie artists). Admins control
          approval and catalog visibility.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (rows ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No tracks found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Artist page</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Roster</th>
                <th className="px-3 py-2 font-medium">Draft</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(rows ?? []).map((t) => {
                const ar = t.artists as { display_name?: string } | null;
                return (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-medium">{t.title}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{ar?.display_name ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{t.moderation_status}</td>
                    <td className="px-3 py-2">{t.label_roster_release ? "Label roster" : "Indie / other"}</td>
                    <td className="px-3 py-2">{t.is_draft ? "Yes" : "No"}</td>
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
