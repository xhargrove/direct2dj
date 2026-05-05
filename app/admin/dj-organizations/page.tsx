import { DjOrganizationRow } from "@/components/admin/dj-organization-row";
import { createClient } from "@/lib/supabase/server";
import type { ApprovalStatus } from "@/lib/types/database";

/** First word of the display name, lowercased — used to group e.g. "Coalition East" and "Coalition West". */
function groupKeyFromDisplayName(displayName: string): string {
  const w = displayName.trim().split(/\s+/)[0] ?? "";
  if (!w) return "";
  return w.toLowerCase();
}

function groupHeadingLabel(key: string): string {
  if (!key) return "Other";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

type OrgRow = {
  id: string;
  name_key: string;
  display_name: string;
  moderation_status: ApprovalStatus;
  formed_at: string | null;
  dj_organization_members: { dj_id: string }[] | { dj_id: string } | null;
};

export default async function AdminDjOrganizationsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("dj_organizations")
    .select(
      `
      id,
      name_key,
      display_name,
      moderation_status,
      formed_at,
      dj_organization_members ( dj_id )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-sm text-red-600">Could not load organizations: {error.message}</div>;
  }

  const raw = (rows ?? []) as unknown as OrgRow[];
  const list = [...raw].sort((a, b) => {
    const pa = a.moderation_status === "pending" ? 0 : 1;
    const pb = b.moderation_status === "pending" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" });
  });

  const byGroup = new Map<string, OrgRow[]>();
  for (const r of list) {
    const gk = groupKeyFromDisplayName(r.display_name);
    const arr = byGroup.get(gk) ?? [];
    arr.push(r);
    byGroup.set(gk, arr);
  }
  const groupKeys = [...byGroup.keys()].sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ organizations</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          DJs choose a crew or organization name during onboarding. Crew names whose <strong>first word is Coalition</strong>{" "}
          resolve to a single org: <strong>Coalition DJs</strong>. Other brands stay separate unless they match exactly.
          When two or more DJs share an org, it is marked as formed. Only admins can approve or reject an organization.
          Below, remaining orgs are <strong>grouped by the first word</strong> of the display name.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groupKeys.map((gk) => {
          const groupRows = byGroup.get(gk) ?? [];
          const n = groupRows.length;
          return (
            <section
              key={gk || "other"}
              aria-labelledby={`org-group-${gk || "other"}`}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40"
            >
              <div
                id={`org-group-${gk || "other"}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200/90 bg-white/70 px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-950/50"
              >
                <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {groupHeadingLabel(gk)}
                </h2>
                <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                  {n} organization{n === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="flex flex-col gap-3 p-4">
                {groupRows.map((r) => {
                  const membersRaw = r.dj_organization_members;
                  const membersArray = Array.isArray(membersRaw) ? membersRaw : membersRaw ? [membersRaw] : [];
                  const memberCount = membersArray.length;
                  return (
                    <DjOrganizationRow
                      key={r.id}
                      orgId={r.id}
                      displayName={r.display_name}
                      nameKey={r.name_key}
                      moderationStatus={r.moderation_status}
                      formedAt={r.formed_at}
                      memberCount={memberCount}
                      inGroup
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {list.length === 0 ? <p className="text-sm text-zinc-500">No organizations yet.</p> : null}
    </div>
  );
}
