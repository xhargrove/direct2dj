import { createClient } from "@/lib/supabase/server";
import { fetchDjOrganizationPeers } from "@/lib/dj/organization-peers";

type Props = { djId: string };

export async function DjCrewRoster({ djId }: Props) {
  const supabase = await createClient();
  const peers = await fetchDjOrganizationPeers(supabase, djId);
  if (peers.length === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold tracking-tight">Your crew</h2>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Only members of your organization can see this list.
      </p>
      <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
        {peers.map((peer) => (
          <li key={peer.dj_id} className="flex justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
            <span>{peer.display_name ?? "DJ"}</span>
            {peer.dj_id === djId ? (
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">You</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
