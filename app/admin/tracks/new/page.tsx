import Link from "next/link";
import { AdminNewTrackForm } from "@/components/admin/admin-new-track-form";
import { createClient } from "@/lib/supabase/server";

export default async function AdminNewTrackPage() {
  const supabase = await createClient();
  const { data: artists, error } = await supabase
    .from("artists")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Could not load artists: {error.message}
      </div>
    );
  }

  const rows = (artists ?? []) as { id: string; display_name: string }[];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New track (admin)</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create a draft for any artist without Stripe submission checkout. Use this for comps,
          internal uploads, or waived fees — then finish metadata and packs from the track review
          screen like any other submission.
        </p>
      </div>

      <AdminNewTrackForm artists={rows} />

      <p className="text-center text-sm">
        <Link href="/admin/tracks" className="underline underline-offset-4">
          Back to tracks
        </Link>
      </p>
    </div>
  );
}
