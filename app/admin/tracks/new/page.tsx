import Link from "next/link";
import { AdminAddArtistForm } from "@/components/admin/admin-add-artist-form";
import { AdminHouseDraftButton } from "@/components/admin/admin-house-draft-button";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New DJ pack (admin)</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Start a free draft for internal promos, DJ service drops, comps, or waived-fee releases — no artist submission
          checkout. Use the quick path to upload under your own login, or assign the pack to another artist account
          below.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Quick upload (you as owner)
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No separate artist email or invite. Creates one internal “house” artist row tied to your admin profile so
          files live under your account prefix. Put real promo / featured artist names in track metadata on the next
          screen.
        </p>
        <AdminHouseDraftButton />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          1. Artist account (if they are not in the database yet)
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Use the same email/display name you want on promos. After saving, the page refreshes so you can select them in
          step 2.
        </p>
        <AdminAddArtistForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          2. Create draft for that artist
        </h2>
        <AdminNewTrackForm key={rows.map((r) => r.id).join(",") || "no-artists"} artists={rows} />
      </section>

      <p className="text-center text-sm">
        <Link href="/admin/tracks" className="underline underline-offset-4">
          Back to tracks
        </Link>
      </p>
    </div>
  );
}
