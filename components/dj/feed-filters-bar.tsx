import { DjFeedFilters } from "@/components/dj/feed-filters";
import { createClient } from "@/lib/supabase/server";

export async function DjFeedFiltersSidebar() {
  const supabase = await createClient();
  const genreRows = await supabase.from("tracks").select("genre");
  const genreOptions = [...new Set((genreRows.data ?? []).map((r) => r.genre).filter(Boolean))].sort() as string[];

  return (
    <aside
      id="discover-filters"
      className="dj-sidebar scroll-mt-24 rounded-lg border border-white/10 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-56 lg:overflow-y-auto lg:overscroll-contain"
    >
      <div className="px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Filter catalog</p>
        <p className="mt-1 text-xs text-zinc-500">Narrow Discover — updates the list as you change fields.</p>
        <div className="mt-4">
          <DjFeedFilters genreOptions={genreOptions} layout="sidebar" />
        </div>
      </div>
    </aside>
  );
}
