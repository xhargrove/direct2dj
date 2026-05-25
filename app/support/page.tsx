import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Need help with your Digital Service Pack account, DJ application, or workspace access? Contact our team and
          include the email address on your account.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center justify-center underline underline-offset-4">
          Back to home
        </Link>
      </div>
    </div>
  );
}
