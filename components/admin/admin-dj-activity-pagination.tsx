import Link from "next/link";
import { ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE } from "@/lib/admin/dj-activity-feed";

export function AdminDjActivityPagination({
  path,
  page,
  total,
  pageSize,
  totalPages,
}: {
  path: string;
  page: number;
  total: number;
  pageSize: number;
  totalPages: number;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const href = (p: number) => {
    const base = path.split("?")[0] ?? path;
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (pageSize !== ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE) {
      params.set("pageSize", String(pageSize));
    }
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  };

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-zinc-600 dark:text-zinc-400">
        {total === 0 ? (
          "No rows."
        ) : (
          <>
            Showing <span className="tabular-nums">{start}</span>–<span className="tabular-nums">{end}</span> of{" "}
            <span className="tabular-nums">{total}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className="font-medium underline underline-offset-4">
            Previous
          </Link>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">Previous</span>
        )}
        <span className="text-zinc-500 dark:text-zinc-400">
          Page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{totalPages}</span>
        </span>
        {page < totalPages ? (
          <Link href={href(page + 1)} className="font-medium underline underline-offset-4">
            Next
          </Link>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">Next</span>
        )}
      </div>
    </div>
  );
}
