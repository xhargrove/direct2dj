import Link from "next/link";
import { AdminDjActivityPagination } from "@/components/admin/admin-dj-activity-pagination";
import { AdminDjActivityTable } from "@/components/admin/admin-dj-activity-table";
import {
  ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE,
  fetchAdminDjActivityFeed,
  MAX_ADMIN_DJ_ACTIVITY_PAGE_SIZE,
} from "@/lib/admin/dj-activity-feed";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ page?: string; pageSize?: string }> };

export default async function AdminDjActivityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawPs = Number.parseInt(sp.pageSize ?? "", 10);
  const pageSize =
    Number.isFinite(rawPs) && rawPs > 0 ? Math.min(MAX_ADMIN_DJ_ACTIVITY_PAGE_SIZE, rawPs) : ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE;

  const supabase = await createClient();
  const result = await fetchAdminDjActivityFeed(supabase, { page, pageSize });

  if (!result.ok) {
    return <p className="text-sm text-red-600">Could not load DJ activity: {result.error}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ activity</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Downloads, play reports, ratings, and feedback across all DJs (newest first, paginated). Optional query{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">pageSize</code> (1–
          {MAX_ADMIN_DJ_ACTIVITY_PAGE_SIZE}, default {ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE}). Open a{" "}
          <Link href="/admin/djs" className="underline underline-offset-4">
            DJ
          </Link>{" "}
          for one profile’s timeline.
        </p>
      </div>

      <AdminDjActivityTable items={result.items} showDjColumn />
      <AdminDjActivityPagination
        path="/admin/dj-activity"
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </div>
  );
}
