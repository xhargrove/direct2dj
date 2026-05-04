import { DjVettingRow } from "@/components/admin/dj-vetting-row";
import { createClient } from "@/lib/supabase/server";
import type { DjTier, DjVettingStatus } from "@/lib/types/database";

type Row = {
  id: string;
  display_name: string;
  vetting_status: DjVettingStatus;
  dj_tier: DjTier | null;
  dj_applications: {
    dj_name: string;
    city: string;
    state: string;
    email: string;
    phone: string;
    updated_at: string;
    years_djing: number | null;
    primary_genres: string | null;
  } | null;
};

export default async function AdminDjApplicationsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("djs")
    .select(
      `
      id,
      display_name,
      vetting_status,
      dj_tier,
      dj_applications (
        dj_name,
        city,
        state,
        email,
        phone,
        updated_at,
        years_djing,
        primary_genres
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-sm text-red-600">Could not load DJs: {error.message}</div>;
  }

  const raw = (rows ?? []) as unknown as Row[];
  const list = [...raw].sort((a, b) => {
    const pa = a.vetting_status === "pending" ? 0 : 1;
    const pb = b.vetting_status === "pending" ? 0 : 1;
    return pa - pb;
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ applications</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Pending DJs are listed first. Approve assigns tier and copies application name and location onto the DJ
          profile for artist-facing analytics.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {list.map((r) => (
          <DjVettingRow
            key={r.id}
            djId={r.id}
            displayName={r.display_name}
            vettingStatus={r.vetting_status}
            djTier={r.dj_tier}
            application={r.dj_applications}
          />
        ))}
      </ul>

      {list.length === 0 ? <p className="text-sm text-zinc-500">No DJs.</p> : null}
    </div>
  );
}
