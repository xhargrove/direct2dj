import type { ApprovalStatus } from "@/lib/types/database";

export function TrackStatusBadges({
  moderationStatus,
  isDraft,
}: {
  moderationStatus: ApprovalStatus;
  isDraft: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-medium">
      {isDraft ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
          Draft — complete pack & submit for review
        </span>
      ) : (
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
          Submitted — awaiting admin
        </span>
      )}
      <span
        className={`rounded-full px-2.5 py-1 ${
          moderationStatus === "approved"
            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
            : moderationStatus === "rejected"
              ? "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-100"
              : "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        Admin: {moderationStatus}
      </span>
      {!isDraft && moderationStatus === "pending" ? (
        <span className="text-zinc-600 dark:text-zinc-400">
          DJs cannot access this track until an admin approves it.
        </span>
      ) : null}
    </div>
  );
}
