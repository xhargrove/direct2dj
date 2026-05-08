import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDjActivityItem = {
  at: string;
  kind: string;
  detail: string;
  trackId: string;
  trackTitle: string;
  djId: string;
  djName: string;
};

/** Default rows per page for admin DJ activity (`?pageSize=` overrides, max {@link MAX_ADMIN_DJ_ACTIVITY_PAGE_SIZE}). */
export const ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = ADMIN_DJ_ACTIVITY_DEFAULT_PAGE_SIZE;
export const MAX_ADMIN_DJ_ACTIVITY_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = MAX_ADMIN_DJ_ACTIVITY_PAGE_SIZE;

type RpcFeedRow = {
  activity_at: string;
  kind: string;
  detail: string;
  track_id: string;
  track_title: string;
  dj_id: string;
  dj_name: string;
};

export type AdminDjActivityFeedResult =
  | {
      ok: true;
      items: AdminDjActivityItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  | { ok: false; error: string };

/**
 * Paginated merged promo activity for admin (downloads, play reports, ratings, feedback).
 * Uses DB RPC `admin_dj_activity_feed` for correct ordering across pages.
 */
export async function fetchAdminDjActivityFeed(
  supabase: SupabaseClient,
  opts: {
    djId?: string | null;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<AdminDjActivityFeedResult> {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.round(opts.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const requestedPage = Math.max(1, Math.round(opts.page ?? 1));

  const totalRes = await supabase.rpc("admin_dj_activity_feed_total", {
    p_dj_id: opts.djId ?? null,
  });

  if (totalRes.error) {
    return { ok: false, error: totalRes.error.message };
  }

  const total = Number(totalRes.data ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(requestedPage, totalPages);

  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("admin_dj_activity_feed", {
    p_dj_id: opts.djId ?? null,
    p_limit: pageSize,
    p_offset: offset,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const items: AdminDjActivityItem[] = ((data ?? []) as RpcFeedRow[]).map((row) => ({
    at: row.activity_at,
    kind: row.kind,
    detail: row.detail,
    trackId: row.track_id,
    trackTitle: row.track_title,
    djId: row.dj_id,
    djName: row.dj_name,
  }));

  return { ok: true, items, total, page, pageSize, totalPages };
}
