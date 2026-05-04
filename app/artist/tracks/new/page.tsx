import Link from "next/link";
import { StartDraftButton } from "@/components/artist/start-draft-button";

export default function NewTrackPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New DJ pack</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create a draft, add metadata and required audio/art files, then submit for admin review.
          Tracks always start as pending — you cannot publish directly.
        </p>
      </div>
      <StartDraftButton />
      <p className="text-center text-sm">
        <Link href="/artist/tracks" className="underline">
          Back to tracks
        </Link>
      </p>
    </div>
  );
}
