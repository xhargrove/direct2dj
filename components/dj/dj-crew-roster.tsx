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
      <p id="dj-crew-roster-hint" className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Only members of your organization can see this list.
      </p>
      <label htmlFor="dj-crew-roster-select" className="mt-3 flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">DJs on your team</span>
        <select
          id="dj-crew-roster-select"
          name="dj_crew_roster"
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          defaultValue={djId}
          aria-describedby="dj-crew-roster-hint"
        >
          {peers.map((peer) => (
            <option key={peer.dj_id} value={peer.dj_id}>
              {(peer.display_name?.trim() ? peer.display_name : "DJ") + (peer.dj_id === djId ? " (you)" : "")}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
