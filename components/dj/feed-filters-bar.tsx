import { DjFeedFilters } from "@/components/dj/feed-filters";
import { createClient } from "@/lib/supabase/server";

export async function DjFeedFiltersBar() {
  const supabase = await createClient();
  const genreRows = await supabase.from("tracks").select("genre");
  const genreOptions = [...new Set((genreRows.data ?? []).map((r) => r.genre).filter(Boolean))].sort() as string[];

  return (
    <div
      id="discover-filters"
      className="sticky top-0 z-20 -mx-1 scroll-mt-24 rounded-lg border border-zinc-200/80 bg-background/95 px-3 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85 dark:border-zinc-800"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Filter catalog
      </p>
      <DjFeedFilters genreOptions={genreOptions} />
    </div>
  );
}
