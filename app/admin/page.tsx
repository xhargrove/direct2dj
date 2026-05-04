export default function AdminHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        This route is protected for accounts whose profile role is{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">admin</code>
        . Promote users by updating{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
          profiles.role
        </code>{" "}
        in the Supabase dashboard or SQL editor (only admins can change roles per database policy).
      </p>
    </div>
  );
}
