import Link from "next/link";
import { copyForAccessState } from "@/lib/auth/account-access-copy";
import type { AccountAccessState } from "@/lib/auth/account-access-state";

type Props = {
  state: AccountAccessState;
  /** When set, overrides the default copy message (e.g. suspended accounts). */
  message?: string;
};

export function AccountAccessGate({ state, message }: Props) {
  const copy = copyForAccessState(state);
  if (!copy) return null;

  const body = message?.trim() || copy.message;

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      role="status"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{copy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
      </div>
      <div>
        <Link
          href={copy.href}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 sm:w-auto"
        >
          Continue
        </Link>
      </div>
    </div>
  );
}
