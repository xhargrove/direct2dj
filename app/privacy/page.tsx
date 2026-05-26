import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Digital Service Pack",
  description: "How Digital Service Pack collects, uses, and protects your information.",
};

const LAST_UPDATED = "May 20, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-12">
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Digital Service Pack · Last updated {LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Overview</h2>
          <p>
            Digital Service Pack (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website and mobile
            app at{" "}
            <a href="https://digitalservicepack.com" className="underline underline-offset-4">
              digitalservicepack.com
            </a>{" "}
            (the &quot;Service&quot;). This policy describes what information we collect, how we use it, and the choices
            you have. By using the Service, you agree to this policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Account data</strong> — email address
              and authentication credentials you provide when you sign up or sign in (handled by our auth provider).
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Profile data</strong> — role (artist, DJ,
              label, admin), display name, and profile fields you choose to add (for example DJ bio, city/state, tier,
              and privacy toggles).
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Content you submit</strong> — track
              metadata, promo artwork, audio packs, play reports, ratings, feedback, and related workspace activity.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Usage data</strong> — pages and features
              you use, downloads, and technical logs (IP address, browser or app user agent, timestamps) needed to
              operate and secure the Service.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Payment data</strong> — when you pay for
              submissions or promotions, payment card and billing details are processed by Stripe; we receive payment
              status and limited billing metadata, not full card numbers.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">How we use information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, maintain, and improve the Service (catalog, DJ discovery, downloads, reporting).</li>
            <li>Authenticate users, enforce access rules (for example DJ vetting), and prevent abuse.</li>
            <li>Process payments and fulfill artist or label workflows.</li>
            <li>Send service-related email (for example application status or account notices) when enabled.</li>
            <li>Comply with law and protect the rights and safety of users and the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Sharing</h2>
          <p className="mb-3">We do not sell your personal information. We share data only as needed to run the Service:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Service providers</strong> — hosting
              (Vercel), database and authentication (Supabase), payments (Stripe), and email delivery when configured.
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Other users</strong> — according to your
              role and privacy settings (for example artists may see aggregated DJ feedback; DJs control contact and
              visibility options in workspace settings).
            </li>
            <li>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Legal</strong> — when required by law or
              to respond to valid requests.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Cookies and local storage</h2>
          <p>
            We use cookies and similar technologies for sign-in sessions and security. The iOS app loads our production
            website in a WebView; the same session cookies apply. You can clear cookies in your browser settings; signing
            out ends your session in the app.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Retention</h2>
          <p>
            We keep information while your account is active and as needed for legal, billing, and operational purposes.
            You may request deletion of your account by contacting us; some records may be retained where required by law
            or for legitimate business needs (for example payment records).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Your choices</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Update profile and DJ privacy settings in your workspace.</li>
            <li>Sign out at any time from the app or website.</li>
            <li>
              Request access, correction, or deletion of personal data by contacting{" "}
              <Link href="/support" className="underline underline-offset-4">
                support
              </Link>
              .
            </li>
          </ul>
          <p className="mt-3">
            If you are in a region with additional privacy rights (for example California or the EEA), you may have the
            right to know, delete, or opt out of certain processing. Contact us to exercise those rights.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Children</h2>
          <p>
            The Service is not directed to children under 13 (or the minimum age in your jurisdiction). We do not
            knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Changes</h2>
          <p>
            We may update this policy from time to time. We will post the revised version on this page and update the
            &quot;Last updated&quot; date. Continued use after changes means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Contact</h2>
          <p>
            Questions about this policy or your data: visit{" "}
            <Link href="/support" className="underline underline-offset-4">
              Support
            </Link>{" "}
            or email the address listed there with the email on your account.
          </p>
        </section>
      </div>

      <footer className="mt-10 flex flex-wrap gap-4 border-t border-zinc-800 pt-6 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Home
        </Link>
        <Link href="/support" className="underline underline-offset-4">
          Support
        </Link>
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </footer>
    </article>
  );
}
