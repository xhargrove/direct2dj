import Link from "next/link";
import { AdminCommunicationsForm } from "@/components/admin/admin-communications-form";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import { createClient } from "@/lib/supabase/server";

type BroadcastRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  audience: string;
  recipient_count: number;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  djs: { display_name: string } | null;
};

type Props = {
  searchParams: Promise<{ dj_id?: string }>;
};

function audienceLabel(row: BroadcastRow): string {
  if (row.audience === "single_dj") {
    const name = row.djs?.display_name?.trim();
    return name ? `One DJ · ${name}` : "One DJ";
  }
  return "All approved DJs";
}

export default async function AdminCommunicationsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialTargetDjId = sp.dj_id?.trim() || null;

  const supabase = await createClient();

  const [{ data: djs, error: djErr }, { data: history, error: histErr }] = await Promise.all([
    supabase
      .from("djs")
      .select("id, display_name, vetting_status")
      .order("display_name", { ascending: true }),
    supabase
      .from("admin_broadcasts")
      .select(
        `
        id,
        title,
        body,
        href,
        audience,
        recipient_count,
        created_at,
        profiles:created_by ( full_name, email ),
        djs:target_dj_id ( display_name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (djErr) {
    return (
      <p className="text-sm text-red-600">
        Could not load DJs: {djErr.message}. Apply migration{" "}
        <code className="text-xs">20260520193000_admin_broadcasts.sql</code> if the table is missing.
      </p>
    );
  }

  const djOptions = (djs ?? []).map((d) => ({
    id: d.id,
    display_name: d.display_name ?? "DJ",
    vetting_status: d.vetting_status ?? "pending",
  }));

  const list = (history ?? []) as unknown as BroadcastRow[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ communications</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Send in-app announcements to approved DJs or one DJ. Messages appear in their notification bell (no email in
          v1).
        </p>
      </div>

      <AdminCommunicationsForm djs={djOptions} initialTargetDjId={initialTargetDjId} />

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Sent messages</h2>
        {histErr ? (
          <p className="mt-2 text-sm text-red-600">
            Could not load history: {histErr.message}. Run{" "}
            <code className="text-xs">supabase db push</code> for admin_broadcasts.
          </p>
        ) : list.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No announcements sent yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {list.map((row) => {
              const sender = row.profiles?.full_name?.trim() || row.profiles?.email || "Admin";
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.title}</div>
                  {row.body ? (
                    <p className="mt-1 line-clamp-2 text-zinc-600 dark:text-zinc-400">{row.body}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>{audienceLabel(row)}</span>
                    <span>· {row.recipient_count} notified</span>
                    <span>· {sender}</span>
                    <span>· {formatDateTimeDisplay(row.created_at)}</span>
                  </div>
                  {row.href ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Link:{" "}
                      <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">{row.href}</code>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        <Link href="/admin/djs" className="underline underline-offset-4">
          DJ directory
        </Link>{" "}
        — use “Message DJ” to pre-fill a single recipient.
      </p>
    </div>
  );
}
