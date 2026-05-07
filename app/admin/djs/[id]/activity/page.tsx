import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDjActivityPagination } from "@/components/admin/admin-dj-activity-pagination";
import { AdminDjActivityTable } from "@/components/admin/admin-dj-activity-table";
import { fetchAdminDjActivityFeed } from "@/lib/admin/dj-activity-feed";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminSingleDjActivityPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const rawPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const supabase = await createClient();

  const { data: dj, error: djErr } = await supabase
    .from("djs")
    .select("id, display_name")
    .eq("id", id)
    .maybeSingle();

  if (djErr || !dj) {
    notFound();
  }

  const result = await fetchAdminDjActivityFeed(supabase, { djId: id, page });

  if (!result.ok) {
    return <p className="text-sm text-red-600">Could not load activity: {result.error}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs text-zinc-500">
          <Link href="/admin/djs" className="underline underline-offset-4">
            DJs
          </Link>
          {" · "}
          <Link href="/admin/dj-activity" className="underline underline-offset-4">
            All DJ activity
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{dj.display_name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Downloads, reported plays, ratings, and feedback — newest first, paginated (same sources as the DJ-facing
          activity view, with admin links to tracks).
        </p>
      </div>

      <AdminDjActivityTable items={result.items} showDjColumn={false} />
      <AdminDjActivityPagination
        path={`/admin/djs/${id}/activity`}
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </div>
  );
}
