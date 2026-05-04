import Link from "next/link";
import { redirect } from "next/navigation";
import { djTierLabel } from "@/lib/dj/tier-label";
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
    .select("email, full_name")
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your DJ profile</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          How you appear in the system. Contact and location options are on{" "}
          <Link href="/dj/settings" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Privacy
          </Link>
          .
        </p>
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
            <dd className="mt-0.5">{new Date(d.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
