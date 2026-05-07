import Link from "next/link";
import { AdminDjActivityPagination } from "@/components/admin/admin-dj-activity-pagination";
import { AdminDjActivityTable } from "@/components/admin/admin-dj-activity-table";
import { fetchAdminDjActivityFeed } from "@/lib/admin/dj-activity-feed";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AdminDjActivityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const supabase = await createClient();
  const result = await fetchAdminDjActivityFeed(supabase, { page });

  if (!result.ok) {
    return <p className="text-sm text-red-600">Could not load DJ activity: {result.error}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ activity</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Downloads, play reports, ratings, and feedback across all DJs (newest first, paginated). Open a{" "}
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
