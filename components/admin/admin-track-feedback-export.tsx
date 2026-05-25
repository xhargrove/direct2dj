type Props = {
  trackId: string;
  className?: string;
};

const FORMATS = [
  { key: "csv", label: "CSV" },
  { key: "txt", label: "Text" },
  { key: "pdf", label: "PDF" },
] as const;

export function AdminTrackFeedbackExport({ trackId, className }: Props) {
  return (
    <div className={className ?? ""}>
      <p className="text-xs text-zinc-500">
        Download all DJ ratings and feedback for this track (full admin export).
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FORMATS.map(({ key, label }) => (
          <a
            key={key}
            href={`/api/admin/tracks/${trackId}/feedback-export?format=${key}`}
            className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
