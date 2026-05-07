import Link from "next/link";
import type { DjVettingStatus } from "@/lib/types/database";

/**
 * Explains promo-pool access rules before admins approve (`djs.vetting_status`).
 */
export function DjWorkspaceGateBanner({
  vettingStatus,
  hasSubmittedApplication,
}: {
  vettingStatus: DjVettingStatus;
  hasSubmittedApplication: boolean;
}) {
  if (vettingStatus === "approved") {
    return null;
  }

  if (vettingStatus === "suspended") {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
        <p className="font-medium">DJ access suspended</p>
        <p className="mt-1 text-red-900/90 dark:text-red-100/90">
          Promo pool actions are blocked. See{" "}
          <Link href="/dj/application-status" className="font-medium underline underline-offset-2">
            Application status
          </Link>{" "}
          or contact support if this should not apply.
        </p>
      </div>
    );
  }

  if (vettingStatus === "rejected") {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-50">
        <p className="font-medium">Application not approved yet</p>
        <p className="mt-1 text-amber-950/90 dark:text-amber-100/90">
          Update your details and submit again. Open{" "}
          <Link href="/dj/apply" className="font-medium underline underline-offset-2">
            DJ application
          </Link>{" "}
          or review notes on{" "}
          <Link href="/dj/application-status" className="font-medium underline underline-offset-2">
            Application status
          </Link>
          .
        </p>
      </div>
    );
  }

  // pending
  if (!hasSubmittedApplication) {
    return (
      <div className="border-b border-cyan-200 bg-gradient-to-r from-cyan-50 to-violet-50 px-4 py-4 text-sm text-zinc-900 dark:border-cyan-900/40 dark:from-cyan-950/50 dark:to-violet-950/40 dark:text-zinc-100">
        <p className="font-semibold tracking-tight">Complete your DJ application first</p>
        <p className="mt-1.5 max-w-3xl text-zinc-800 dark:text-zinc-200">
          The Discover feed, downloads, and ratings unlock only after you submit this form and an admin approves your
          profile. Finish every required field, then we can review you for the promo pool.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dj/apply"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Open application
          </Link>
          <Link
            href="/dj/application-status"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-400/80 bg-white/80 px-4 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-950"
          >
            Application status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100">
      <p className="font-medium">Application received — pending review</p>
      <p className="mt-1 text-zinc-700 dark:text-zinc-300">
        Discover, downloads, and ratings stay closed until an admin approves you. Watch{" "}
        <Link href="/dj/application-status" className="font-medium underline underline-offset-2">
          Application status
        </Link>{" "}
        for updates.
      </p>
    </div>
  );
}
