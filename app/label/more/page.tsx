import { SignOutButton } from "@/components/shell/sign-out-button";

export default function LabelMorePage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Account actions for your label desk.</p>
      </div>
      <div className="shell-mobile border-t border-white/10 pt-4">
        <SignOutButton className="dj-btn-ghost min-h-11 w-full rounded-lg border px-4 text-sm font-medium" />
      </div>
    </div>
  );
}
