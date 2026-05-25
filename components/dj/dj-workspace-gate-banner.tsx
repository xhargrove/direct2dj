import Link from "next/link";
import { copyForAccessState } from "@/lib/auth/account-access-copy";
import type { AccountAccessState } from "@/lib/auth/account-access-state";

type Props = {
  accessState: AccountAccessState;
  message?: string;
};

/**
 * Compact banner for unapproved DJs inside the DJ workspace shell.
 */
export function DjWorkspaceGateBanner({ accessState, message }: Props) {
  if (accessState === "DJ_APPROVED") {
    return null;
  }

  const copy = copyForAccessState(accessState);
  if (!copy) {
    const body = message?.trim();
    if (!body) return null;
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
        <p className="font-medium">DJ workspace access restricted</p>
        <p className="mt-1 text-red-900/90 dark:text-red-100/90">{body}</p>
      </div>
    );
  }

  const body = message?.trim() || copy.message;
  const tone =
    accessState === "DJ_APPLICATION_REJECTED"
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-50"
      : accessState === "DJ_APPLICATION_NOT_STARTED"
        ? "border-cyan-200 bg-gradient-to-r from-cyan-50 to-violet-50 text-zinc-900 dark:border-cyan-900/40 dark:from-cyan-950/50 dark:to-violet-950/40 dark:text-zinc-100"
        : "border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100";

  return (
    <div className={`border-b px-4 py-4 text-sm ${tone}`}>
      <p className="font-semibold tracking-tight">{copy.title}</p>
      <p className="mt-1.5 max-w-3xl opacity-90">{body}</p>
      <div className="mt-3">
        <Link href={copy.href} className="font-medium underline underline-offset-2">
          {accessState === "DJ_APPLICATION_PENDING" ? "Check application status" : "Continue"}
        </Link>
      </div>
    </div>
  );
}
