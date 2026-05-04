import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/context";

const ALLOWED_BUCKET = "promos" as const;
const MAX_PATH_LEN = 2048;

function isSafePathSegment(path: string): boolean {
  if (!path || path.length > MAX_PATH_LEN) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  return true;
}

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const raw = body as { path?: unknown; bucket?: unknown };
  const path = typeof raw.path === "string" ? raw.path.trim() : "";

  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  if (!isSafePathSegment(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const bucketCandidate =
    typeof raw.bucket === "string" && raw.bucket.trim() !== ""
      ? raw.bucket.trim()
      : ALLOWED_BUCKET;

  if (bucketCandidate !== ALLOWED_BUCKET) {
    return NextResponse.json({ error: "Unsupported bucket" }, { status: 400 });
  }

  const { data: rows, error: fileLookupErr } = await ctx.supabase
    .from("track_files")
    .select("id")
    .eq("storage_path", path)
    .limit(1);

  if (fileLookupErr) {
    return NextResponse.json({ error: fileLookupErr.message }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json(
      { error: "Path is not registered on any track file" },
      { status: 404 },
    );
  }

  const { data, error } = await ctx.supabase.storage.from(ALLOWED_BUCKET).createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
