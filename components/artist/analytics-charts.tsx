/** Lightweight bar / timeline visuals — no chart libraries. */

export type TimelinePoint = { bucket_date: string; download_count: number };

export function fillDailyDownloads(rows: TimelinePoint[], days: number): TimelinePoint[] {
  const lim = Math.max(7, Math.min(days, 365));
  const map = new Map(rows.map((r) => [r.bucket_date.slice(0, 10), r.download_count]));
  const out: TimelinePoint[] = [];
  const today = new Date();
  for (let i = lim - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ bucket_date: key, download_count: map.get(key) ?? 0 });
  }
  return out;
}

export function AnalyticsBar({
  label,
  value,
  max,
  suffix,
  barClassName = "bg-zinc-800 dark:bg-zinc-200",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  barClassName?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="shrink-0 tabular-nums text-zinc-500">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full transition-[width] ${barClassName}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DownloadTimelineStrip({
  points,
  daysLabel,
}: {
  points: TimelinePoint[];
  daysLabel: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.download_count));
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        {daysLabel}. Days with no downloads show zero — not an estimate.
      </p>
      <div className="-mx-1 flex max-w-full gap-px overflow-x-auto pb-1 pt-1">
        {points.map((p) => {
          const h = max > 0 ? Math.max(8, Math.round((p.download_count / max) * 56)) : 8;
          return (
            <div
              key={p.bucket_date}
              className="flex w-2 shrink-0 flex-col items-center justify-end"
              title={`${p.bucket_date}: ${p.download_count}`}
            >
              <div
                className="w-full min-h-[2px] rounded-t bg-zinc-700 dark:bg-zinc-300"
                style={{ height: `${h}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-400">
        <span>{points[0]?.bucket_date ?? ""}</span>
        <span>{points[points.length - 1]?.bucket_date ?? ""}</span>
      </div>
    </div>
  );
}
