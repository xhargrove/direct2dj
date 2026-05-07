import Link from "next/link";
import { requireRoles } from "@/lib/auth/require-role";

export default async function LabelDashboardPage() {
  const { profile } = await requireRoles(["label_rep"]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Label dashboard</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {profile.full_name?.trim() || profile.email}. Build roster artist pages and upload DJ packs;
        releases stay pending until an admin approves them for the catalog.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          <Link href="/label/roster" className="font-medium underline underline-offset-4">
            Roster artists
          </Link>{" "}
          — create artist pages for acts you represent (no separate artist login required).
        </li>
        <li>
          <Link href="/label/catalog" className="font-medium underline underline-offset-4">
            Site catalog
          </Link>{" "}
          — see tracks across the platform (metadata and status). Uploads from your roster appear as label roster releases
          for DJs once approved.
        </li>
      </ul>
    </div>
  );
}
