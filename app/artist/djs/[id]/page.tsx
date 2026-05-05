import Link from "next/link";
import { notFound } from "next/navigation";
import { djTierLabel } from "@/lib/dj/tier-label";
import { createClient } from "@/lib/supabase/server";
import type { DjTier, DjVettingStatus } from "@/lib/types/database";

type Props = { params: Promise<{ id: string }> };

type DjPublicProfileRow = {
  dj_id: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  dj_tier: DjTier | null;
  vetting_status: DjVettingStatus;
  allow_artist_contact: boolean;
  contact_email: string | null;
  instagram: string | null;
  phone: string | null;
  mixcloud_soundcloud_url: string | null;
  club_radio_affiliation: string | null;
};

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

export default async function ArtistDjProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("artist_dj_public_profile", { p_dj_id: id });
  if (error) {
    notFound();
  }

  const row = (Array.isArray(data) ? data[0] : data) as DjPublicProfileRow | undefined;
  if (!row) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/artist/analytics" className="text-zinc-600 underline dark:text-zinc-400">
          ← Analytics
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{row.display_name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          DJ profile visibility is limited to artists this DJ has already interacted with.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-zinc-500">Bio</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{row.bio?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Tier</dt>
            <dd className="mt-0.5">{djTierLabel(row.dj_tier as DjTier | null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Vetting</dt>
            <dd className="mt-0.5">{vettingLabel(row.vetting_status)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">City</dt>
            <dd className="mt-0.5">{row.city?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">State / region</dt>
            <dd className="mt-0.5">{row.state?.trim() || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Contact</h2>
        {row.allow_artist_contact ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">Email</dt>
              <dd className="mt-0.5 break-all">{row.contact_email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Phone</dt>
              <dd className="mt-0.5">{row.phone?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Instagram</dt>
              <dd className="mt-0.5">{row.instagram?.trim() || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">Mixcloud/SoundCloud</dt>
              <dd className="mt-0.5 break-all">{row.mixcloud_soundcloud_url?.trim() || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">Club/Radio affiliation</dt>
              <dd className="mt-0.5">{row.club_radio_affiliation?.trim() || "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            This DJ has not enabled direct artist contact in their privacy settings.
          </p>
        )}
      </section>
    </div>
  );
}
