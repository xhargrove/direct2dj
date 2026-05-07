import Link from "next/link";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import type { AdminDjActivityItem } from "@/lib/admin/dj-activity-feed";

export function AdminDjActivityTable({
  items,
  showDjColumn,
}: {
  items: AdminDjActivityItem[];
  showDjColumn: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No activity in this view yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-3 font-medium">When</th>
            {showDjColumn ? (
              <th className="py-2 pr-3 font-medium">DJ</th>
            ) : null}
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Track</th>
            <th className="py-2 pr-0 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a, i) => (
            <tr key={`${a.kind}-${a.at}-${a.trackId}-${i}`} className="border-b border-zinc-100 dark:border-zinc-800/80">
              <td className="whitespace-nowrap py-2 pr-3 align-top text-xs text-zinc-500">
                {formatDateTimeDisplay(a.at)}
              </td>
              {showDjColumn ? (
                <td className="max-w-[10rem] py-2 pr-3 align-top">
                  <Link
                    href={`/admin/djs/${a.djId}/activity`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {a.djName}
                  </Link>
                </td>
              ) : null}
              <td className="py-2 pr-3 align-top text-zinc-700 dark:text-zinc-300">{a.kind}</td>
              <td className="max-w-[14rem] py-2 pr-3 align-top">
                <Link href={`/admin/tracks/${a.trackId}`} className="underline-offset-4 hover:underline">
                  {a.trackTitle}
                </Link>
              </td>
              <td className="max-w-md py-2 pr-0 align-top text-xs text-zinc-600 dark:text-zinc-400">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
