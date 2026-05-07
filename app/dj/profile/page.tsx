import Link from "next/link";
import { redirect } from "next/navigation";
import { djTierLabel } from "@/lib/dj/tier-label";
import { formatDateDisplay } from "@/lib/format/datetime-display";
import { createClient } from "@/lib/supabase/server";
import type { DjVettingStatus } from "@/lib/types/database";

function vettingLabel(s: DjVettingStatus) {
  switch (s) {
    case "pending":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Not approved";
    case "suspended":
      return "Suspended";
    default:
      return s;
  }
}

export default async function DjProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: dj } = await supabase
    .from("djs")
    .select("id, display_name, bio, city, state, vetting_status, dj_tier, allow_artist_contact, created_at")
    .eq("profile_id", user.id)
    .maybeSingle();

  const d = dj;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your DJ profile</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            How you appear in the system. Contact preferences are on{" "}
            <Link href="/dj/settings" className="font-medium text-zinc-900 underline dark:text-zinc-100">
              Privacy
            </Link>
            .
          </p>
        </div>
        {d ? (
          <Link
            href="/dj/profile/edit"
            className="inline-flex shrink-0 min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Edit profile
          </Link>
        ) : null}
      </div>

      {!d ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No DJ record yet. Start the application from{" "}
          <Link href="/dj/apply" className="underline">
            Apply
          </Link>{" "}
          or check{" "}
          <Link href="/dj/application-status" className="underline">
            Status
          </Link>
          .
        </p>
      ) : (
        <dl className="space-y-4 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          {profile?.avatar_url ? (
            <div className="flex justify-center pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public bucket URL */}
              <img
                src={profile.avatar_url}
                alt=""
                className="h-28 w-28 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
              />
            </div>
          ) : null}
          <div>
            <dt className="text-zinc-500">Display name</dt>
            <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">{d.display_name}</dd>
          </div>
          {profile?.full_name ? (
            <div>
              <dt className="text-zinc-500">Account name</dt>
              <dd className="mt-0.5">{profile.full_name}</dd>
            </div>
          ) : null}
          {profile?.email ? (
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="mt-0.5">{profile.email}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-zinc-500">Bio</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{d.bio?.trim() || "—"}</dd>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">City</dt>
              <dd className="mt-0.5">{d.city?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">State / region</dt>
              <dd className="mt-0.5">{d.state?.trim() || "—"}</dd>
            </div>
          </div>
          <div>
            <dt className="text-zinc-500">Vetting</dt>
            <dd className="mt-0.5">{vettingLabel(d.vetting_status)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">DJ tier</dt>
            <dd className="mt-0.5">{djTierLabel(d.dj_tier)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Allow artist contact</dt>
            <dd className="mt-0.5">{d.allow_artist_contact ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Member since</dt>
            <dd className="mt-0.5">{formatDateDisplay(d.created_at)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
