import Link from "next/link";
import { AdminUserLookupPanel } from "@/components/admin/admin-user-lookup-panel";
import { AdminUserOutreachForm } from "@/components/admin/admin-user-outreach-form";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import { isEmailProviderConfigured } from "@/lib/notifications/email";
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
  searchParams: Promise<{ dj_id?: string; profile_id?: string; audience?: string }>;
};

function audienceLabel(row: BroadcastRow): string {
  if (row.audience === "single_dj") {
    const name = row.djs?.display_name?.trim();
    return name ? `One DJ · ${name}` : "One DJ";
  }
  if (row.audience === "single_profile") return "One user";
  if (row.audience === "pending_djs") return "All pending DJs";
  return "All approved DJs";
}

export default async function AdminUserOutreachPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialTargetDjId = sp.dj_id?.trim() || null;
  const initialTargetProfileId = sp.profile_id?.trim() || null;
  const initialAudience =
    sp.audience === "single_profile" ||
    sp.audience === "single_dj" ||
    sp.audience === "pending_djs" ||
    sp.audience === "all_approved_djs"
      ? sp.audience
      : null;

  const supabase = await createClient();
  const emailConfigured = isEmailProviderConfigured();

  const [{ data: djRows, error: djErr }, { data: history, error: histErr }, { data: artistRows }] =
    await Promise.all([
      supabase
        .from("djs")
        .select("id, display_name, vetting_status, profile_id, profiles ( email )")
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
      supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("role", "artist")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  if (djErr) {
    return (
      <p className="text-sm text-red-600">
        Could not load DJs: {djErr.message}. Apply migration{" "}
        <code className="text-xs">20260603120000_admin_broadcast_user_outreach.sql</code> if outreach audiences fail.
      </p>
    );
  }

  type DjRow = {
    id: string;
    display_name: string | null;
    vetting_status: string | null;
    profile_id: string;
    profiles: { email: string | null } | { email: string | null }[] | null;
  };

  const rawDjs = (djRows ?? []) as unknown as DjRow[];
  const djOptions = rawDjs.map((d) => {
    const prof = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
    return {
      id: d.id,
      display_name: d.display_name ?? "DJ",
      vetting_status: d.vetting_status ?? "pending",
      profile_id: d.profile_id,
      email: prof?.email ?? null,
    };
  });

  const pendingCount = djOptions.filter((d) => d.vetting_status === "pending").length;
  const approvedCount = djOptions.filter((d) => d.vetting_status === "approved").length;
  const list = (history ?? []) as unknown as BroadcastRow[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User outreach</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Email and notify users about pending DJ applications, wrong account roles, and general updates. Messages
          appear in the notification bell
          {emailConfigured ? " and are emailed when the user has an address on file" : ""}.
          {!emailConfigured ? (
            <>
              {" "}
              Add <code className="text-xs">RESEND_API_KEY</code> (or SendGrid/Postmark) in production to enable email.
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="text-2xl font-semibold tabular-nums">{pendingCount}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Pending DJ applications</div>
          {pendingCount > 0 ? (
            <Link href="/admin/dj-applications" className="mt-2 inline-block text-xs font-medium underline">
              Review queue →
            </Link>
          ) : null}
        </div>
        <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="text-2xl font-semibold tabular-nums">{approvedCount}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Approved DJs</div>
        </div>
        <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="text-2xl font-semibold tabular-nums">{(artistRows ?? []).length}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Recent Artist accounts (check for wrong role)</div>
        </div>
      </div>

      <AdminUserLookupPanel selectedProfileId={initialTargetProfileId} />

      <AdminUserOutreachForm
        key={`${initialTargetProfileId ?? ""}:${initialTargetDjId ?? ""}:${initialAudience ?? ""}`}
        djs={djOptions}
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        emailConfigured={emailConfigured}
        initialTargetDjId={initialTargetDjId}
        initialTargetProfileId={initialTargetProfileId}
        initialAudience={initialAudience}
      />

      {(artistRows ?? []).length > 0 ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Recent Artist signups</h2>
          <p className="mt-1 text-xs text-zinc-500">
            DJs who accidentally chose Artist at signup show here. Look up by email to switch them to DJ.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {(artistRows ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{p.full_name?.trim() || p.email || p.id}</span>
                <span className="text-xs text-zinc-500">{p.email}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Sent messages</h2>
        {histErr ? (
          <p className="mt-2 text-sm text-red-600">Could not load history: {histErr.message}</p>
        ) : list.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No messages sent yet.</p>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
