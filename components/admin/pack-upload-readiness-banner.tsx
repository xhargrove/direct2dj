import type { PackUploadReadiness } from "@/lib/admin/pack-upload-readiness";

export function PackUploadReadinessBanner({ readiness }: { readiness: PackUploadReadiness }) {
  if (readiness.ready) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
        Pack upload check passed: cover and main audio are present. A full admin can approve the track for the DJ
        catalog when ready.
      </p>
    );
  }

  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <strong>Upload incomplete.</strong> Still needed: {readiness.missing.join(" · ")}. Use the DJ pack uploader
      below to add files, then confirm previews play correctly.
    </p>
  );
}
