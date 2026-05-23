type Props = {
  url: string | null | undefined;
  className?: string;
};

export function YoutubeLinkDisplay({ url, className }: Props) {
  if (!url?.trim()) return null;
  return (
    <div className={className}>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">YouTube</h2>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
      >
        Watch official video →
      </a>
    </div>
  );
}
