import { Suspense } from "react";
import { CompleteSubmissionClient } from "./complete-submission-client";

export default function SubmissionCheckoutCompletePage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <Suspense
        fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}
      >
        <CompleteSubmissionClient />
      </Suspense>
    </div>
  );
}
