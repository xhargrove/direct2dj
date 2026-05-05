import type { SupabaseClient } from "@supabase/supabase-js";

export type DjOrgPeer = { dj_id: string; display_name: string | null };

export async function fetchDjOrganizationPeers(supabase: SupabaseClient, djId: string): Promise<DjOrgPeer[]> {
  const { data: membership } = await supabase
    .from("dj_organization_members")
    .select("organization_id")
    .eq("dj_id", djId)
    .maybeSingle();

  if (!membership?.organization_id) return [];

  const { data: peerRows } = await supabase
    .from("dj_organization_members")
    .select("dj_id")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: true });

  const ids = peerRows?.map((r) => r.dj_id) ?? [];
  if (ids.length === 0) return [];

  const { data: djRows } = await supabase.from("djs").select("id, display_name").in("id", ids);
  const nameById = new Map((djRows ?? []).map((d) => [d.id, d.display_name]));

  return ids.map((id) => ({ dj_id: id, display_name: nameById.get(id) ?? null }));
}
