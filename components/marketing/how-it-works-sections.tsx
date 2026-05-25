import Link from "next/link";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-sm font-semibold tabular-nums text-zinc-100">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-zinc-50">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{children}</p>
      </div>
    </li>
  );
}

export function HowItWorksSections() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="dj-card flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <p className="dj-kicker dj-eyebrow">For artists</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">Get your pack to working DJs</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Upload once, deliver clean versions and artwork in one pack, and see real feedback and play reports — not
            buried inbox threads.
          </p>
        </div>
        <ol className="flex flex-col gap-5">
          <Step n={1} title="Create your account">
            Sign up as an artist and open your booth from the dashboard.
          </Step>
          <Step n={2} title="Pay and upload your DJ pack">
            Choose a submission tier, upload metadata, audio versions, artwork, and pack files.
          </Step>
          <Step n={3} title="Pass admin review">
            Our team checks the pack before it goes live in the DJ catalog.
          </Step>
          <Step n={4} title="DJs discover and engage">
            Vetted DJs preview your track, leave feedback and ratings, then download your pack.
          </Step>
          <Step n={5} title="Track results per song">
            Open analytics on each release for downloads, feedback, and play reports. Optional{" "}
            <Link href="/login?next=%2Fartist%2Fpromote" className="font-medium text-violet-300/90 underline-offset-4 hover:underline">
              Featured Spotlight
            </Link>{" "}
            boosts visibility on Discover.
          </Step>
        </ol>
        <Link
          href="/login?mode=signup"
          className="dj-btn-primary mt-auto inline-flex w-full justify-center sm:w-auto sm:self-start"
        >
          Start as an artist
        </Link>
      </article>

      <article className="dj-card flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <p className="dj-kicker dj-eyebrow">For DJs</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">Discover promos built for the booth</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Browse a curated feed, preview before you download, and report plays back to artists — with privacy controls
            on what artists see.
          </p>
        </div>
        <ol className="flex flex-col gap-5">
          <Step n={1} title="Apply and get vetted">
            Create a DJ account and complete the application so we keep the pool working and trusted.
          </Step>
          <Step n={2} title="Browse Discover">
            Filter the feed by genre, BPM, and more. Editorial picks and featured artists appear at the top.
          </Step>
          <Step n={3} title="Preview, rate, and leave feedback">
            Listen to the preview, save a rating (stars, club/radio ready), and write feedback for the artist before
            downloading.
          </Step>
          <Step n={4} title="Download the full DJ pack">
            One ZIP with clean edits, dirty versions, instrumentals, acapellas, and artwork — named for your library.
          </Step>
          <Step n={5} title="Report plays">
            Log where you spun the record so artists get measurable reach, not guesswork.
          </Step>
        </ol>
        <Link
          href="/login?next=%2Fdj%2Ffeed"
          className="dj-btn-primary mt-auto inline-flex w-full justify-center sm:w-auto sm:self-start"
        >
          Open DJ feed
        </Link>
      </article>
    </div>
  );
}
