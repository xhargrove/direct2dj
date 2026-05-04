import { DjOrganizationRow } from "@/components/admin/dj-organization-row";
import { createClient } from "@/lib/supabase/server";
import type { ApprovalStatus } from "@/lib/types/database";

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
    return pa - pb;
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ organizations</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          DJs choose a crew or organization name during onboarding. When two or more DJs share the same name, the group
          is marked as formed. Only admins can approve or reject an organization.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {list.map((r) => {
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
            />
          );
        })}
      </ul>

      {list.length === 0 ? <p className="text-sm text-zinc-500">No organizations yet.</p> : null}
    </div>
  );
}
