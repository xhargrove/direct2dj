import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getApprovedDjCatalogContext } from "@/lib/dj/context";
import { resolvePackDownload } from "@/lib/dj/pack-download-server";
import { djPackDownloadZipFilename } from "@/lib/tracks/dj-download-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id: trackId } = await context.params;
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  const resolved = await resolvePackDownload(ctx.supabase, trackId, ctx.djId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const zipName = djPackDownloadZipFilename({
    credit_artist_name: resolved.creditArtist,
    title: resolved.releaseTitle,
  });

  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.pipe(passThrough);

  void (async () => {
    try {
      for (const file of resolved.files) {
        const { data, error } = await ctx.supabase.storage.from("promos").download(file.storage_path);
        if (error || !data) {
          archive.abort();
          passThrough.destroy(new Error(error?.message ?? `Could not read ${file.filename}`));
          return;
        }
        const buf = Buffer.from(await data.arrayBuffer());
        archive.append(buf, { name: file.filename });
      }
      await archive.finalize();
    } catch (err) {
      archive.abort();
      passThrough.destroy(err instanceof Error ? err : new Error("Pack ZIP failed"));
    }
  })();

  const body = Readable.toWeb(passThrough) as ReadableStream<Uint8Array>;
  const encoded = encodeURIComponent(zipName);

  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
