import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ dj_id?: string }>;
};

/** Legacy path — user outreach is the primary messaging hub. */
export default async function AdminCommunicationsRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const djId = sp.dj_id?.trim();
  if (djId) {
    redirect(`/admin/user-outreach?dj_id=${encodeURIComponent(djId)}&audience=single_dj`);
  }
  redirect("/admin/user-outreach");
}
