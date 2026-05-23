import { notFound } from "next/navigation";
import { AdminTrackReview } from "@/components/admin/admin-track-review";
import { isCoAdminRole } from "@/lib/auth/backstage-access";
import { loadTrackForReview } from "@/lib/admin/load-track-for-review";
import { requireRoles } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function AdminTrackDetailPage({ params }: Props) {
  const { profile } = await requireRoles(["admin", "co_admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const loaded = await loadTrackForReview(supabase, id);
  if ("error" in loaded) {
    notFound();
  }

  return <AdminTrackReview bundle={loaded.data} uploadOnly={isCoAdminRole(profile.role)} />;
}
