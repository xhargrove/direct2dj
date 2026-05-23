import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function CoAdminDashboard() {
  const supabase = await createClient();
  const { count: draftCount } = await supabase
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("is_draft", true);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your access is limited to creating draft DJ packs, uploading files, and checking that cover art and main audio
          are present. Catalog approval, billing, and DJ management are handled by a full admin.
        </p>
      </div>

      <section className="rounded-lg border border-cyan-200 bg-cyan-50/80 px-4 py-4 dark:border-cyan-900/60 dark:bg-cyan-950/40">
        <h2 className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">Start here</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-cyan-900/90 dark:text-cyan-200/90">
          <li>Create a draft via <strong>New DJ pack</strong> (quick upload under your login, or pick an existing artist).</li>
          <li>Open the track and use the DJ pack uploader — cover + main audio are required.</li>
          <li>Confirm file previews play; the upload checklist will show green when ready.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/tracks/new"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            New DJ pack
          </Link>
          <Link
            href="/admin/tracks"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
          >
            All tracks ({draftCount ?? 0} drafts)
          </Link>
        </div>
      </section>
    </div>
  );
}
