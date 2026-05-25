import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/context";
import {
  loadTrackFeedbackExport,
  serializeFeedbackCsv,
  serializeFeedbackPdf,
  serializeFeedbackText,
} from "@/lib/admin/track-feedback-export";

const FORMATS = new Set(["csv", "txt", "text", "pdf"]);

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  const { id: trackId } = await context.params;
  const formatParam = new URL(req.url).searchParams.get("format")?.toLowerCase() ?? "csv";
  if (!FORMATS.has(formatParam)) {
    return NextResponse.json(
      { error: "Invalid format. Use csv, txt, text, or pdf." },
      { status: 400 },
    );
  }

  const loaded = await loadTrackFeedbackExport(ctx.supabase, trackId);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: 404 });
  }

  const format = formatParam === "text" ? "txt" : formatParam;
  const { basename } = loaded.data;

  if (format === "csv") {
    return new NextResponse(serializeFeedbackCsv(loaded.data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${basename}.csv"`,
      },
    });
  }

  if (format === "txt") {
    return new NextResponse(serializeFeedbackText(loaded.data), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${basename}.txt"`,
      },
    });
  }

  const pdf = serializeFeedbackPdf(loaded.data);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${basename}.pdf"`,
    },
  });
}
