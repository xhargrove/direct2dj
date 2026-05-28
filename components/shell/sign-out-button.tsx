export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/sign-out" method="post">
      <button
        type="submit"
        className={
          className ??
          "dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline"
        }
      >
        Sign out
      </button>
    </form>
  );
}
