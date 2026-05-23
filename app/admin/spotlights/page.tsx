import Link from "next/link";
import {
  EditorialSpotlightForm,
  EndSpotlightButton,
} from "@/components/admin/editorial-spotlight-form";
import { SpotlightHubPreview } from "@/components/spotlight/spotlight-hub-preview";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import {
  EDITORIAL_SPOTLIGHT_SECTION_IDS,
  loadSpotlightHub,
  SPOTLIGHT_SECTION_LABELS,
  type EditorialSpotlightSectionId,
} from "@/lib/spotlight/load-spotlight-hub";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSpotlightsPage() {
  const supabase = await createClient();

  const [{ data: tracks }, { data: editorial }, hub] = await Promise.all([
    supabase
      .from("tracks")
      .select("id, title, credit_artist_name, artists ( display_name )")
      .eq("moderation_status", "approved")
      .eq("is_draft", false)
      .eq("catalog_active", true)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("editorial_spotlights")
      .select(
        `
        id,
        slot_type,
        headline,
        starts_at,
        ends_at,
        tracks ( id, title, credit_artist_name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(20),
    loadSpotlightHub({ limitPerSection: 6, filterEmpty: false, dedupe: true }),
  ]);

  const trackOptions = (tracks ?? []).map((t) => {
    const rel = t.artists as { display_name?: string } | { display_name?: string }[] | null;
    const artist = Array.isArray(rel) ? rel[0] : rel;
    return {
      id: t.id as string,
      title: (t.title as string) || "Untitled",
      credit: (t.credit_artist_name as string) || artist?.display_name || "—",
    };
  });

  const now = Date.now();
  const activeEditorial = (editorial ?? []).filter((e) => {
    const start = e.starts_at ? new Date(e.starts_at as string).getTime() : 0;
    const end = e.ends_at ? new Date(e.ends_at as string).getTime() : Number.POSITIVE_INFINITY;
    return start <= now && end > now;
  });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Spotlights</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Assign tracks to editorial slots below — each slot appears on the homepage, <code>/featured</code>, and DJ
          Discover only after you publish it. Paid <strong>Featured Spotlight</strong> rows are separate (artist
          checkout or{" "}
          <Link href="/admin/featured" className="font-medium underline">
            Featured history
          </Link>
          ).
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Editorial slot status</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EDITORIAL_SPOTLIGHT_SECTION_IDS.map((slotId) => {
            const active = activeEditorial.find((e) => e.slot_type === slotId);
            const tr = active?.tracks as { title?: string } | null;
            return (
              <li
                key={slotId}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <p className="font-medium">{SPOTLIGHT_SECTION_LABELS[slotId]}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {active ? (
                    <>
                      Live: {tr?.title ?? "—"}
                      {active.ends_at ? (
                        <> · ends {formatDateTimeDisplay(active.ends_at as string)}</>
                      ) : (
                        <> · no end date</>
                      )}
                    </>
                  ) : (
                    "Unassigned — not visible on Discover yet"
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <EditorialSpotlightForm
          slotType="record_of_week"
          slotLabel={SPOTLIGHT_SECTION_LABELS.record_of_week}
          defaultDays={7}
          tracks={trackOptions}
        />
        <EditorialSpotlightForm
          slotType="dj_pick"
          slotLabel={SPOTLIGHT_SECTION_LABELS.dj_pick}
          defaultDays={5}
          tracks={trackOptions}
        />
        <EditorialSpotlightForm
          slotType="new_release"
          slotLabel={SPOTLIGHT_SECTION_LABELS.new_release}
          defaultDays={7}
          tracks={trackOptions}
        />
        <EditorialSpotlightForm
          slotType="artist_spotlight"
          slotLabel={SPOTLIGHT_SECTION_LABELS.artist_spotlight}
          defaultDays={14}
          tracks={trackOptions}
        />
        <EditorialSpotlightForm
          slotType="must_spin"
          slotLabel={SPOTLIGHT_SECTION_LABELS.must_spin}
          defaultDays={5}
          tracks={trackOptions}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Active editorial</h2>
        {activeEditorial.length === 0 ? (
          <p className="text-sm text-zinc-500">No active editorial spotlights.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeEditorial.map((e) => {
              const tr = e.tracks as { title?: string; credit_artist_name?: string } | null;
              const slot = e.slot_type as EditorialSpotlightSectionId;
              return (
                <li
                  key={e.id as string}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium">
                      {SPOTLIGHT_SECTION_LABELS[slot] ?? String(e.slot_type)}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {tr?.title ?? "—"} · {tr?.credit_artist_name ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDateTimeDisplay(e.starts_at as string)} →{" "}
                      {e.ends_at ? formatDateTimeDisplay(e.ends_at as string) : "open"}
                    </p>
                  </div>
                  <EndSpotlightButton spotlightId={e.id as string} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Live preview (all sections)</h2>
        {hub.error ? <p className="text-sm text-red-600">{hub.error}</p> : null}
        <SpotlightHubPreview sections={hub.sections} linkMode="public" />
      </section>
    </div>
  );
}
