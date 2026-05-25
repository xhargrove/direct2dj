/**
 * Minimal PDF 1.4 writer for plain-text reports (Helvetica, multi-page).
 * ASCII-safe input is recommended; other characters are replaced for WinAnsi compatibility.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 50;
const MARGIN_TOP = 50;
const FONT_SIZE = 10;
const LINE_HEIGHT = 13;
const MAX_CHARS_PER_LINE = 92;

function pdfSafeText(input: string): string {
  return input.replace(/[^\x20-\x7E\n\r\t]/g, "?");
}

function escapePdfString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const parts: string[] = [];
  let rest = line;
  while (rest.length > maxChars) {
    let breakAt = rest.lastIndexOf(" ", maxChars);
    if (breakAt <= 0) breakAt = maxChars;
    parts.push(rest.slice(0, breakAt).trimEnd());
    rest = rest.slice(breakAt).trimStart();
  }
  if (rest.length > 0) parts.push(rest);
  return parts;
}

function wrapText(text: string): string[] {
  const normalized = pdfSafeText(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: string[] = [];
  for (const rawLine of normalized.split("\n")) {
  if (rawLine.length === 0) {
      out.push("");
      continue;
    }
    out.push(...wrapLine(rawLine, MAX_CHARS_PER_LINE));
  }
  return out;
}

function chunkLines(lines: string[], perPage: number): string[][] {
  if (lines.length === 0) return [[""]];
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  return pages;
}

function pageContentStream(lines: string[]): string {
  const startY = PAGE_HEIGHT - MARGIN_TOP;
  const commands: string[] = ["BT", `/F1 ${FONT_SIZE} Tf`, `${LINE_HEIGHT} TL`];
  lines.forEach((line, index) => {
    const y = startY - index * LINE_HEIGHT;
    commands.push(`1 0 0 1 ${MARGIN_X} ${y} Td`, `(${escapePdfString(line)}) Tj`, "T*");
  });
  commands.push("ET");
  return commands.join("\n");
}

export function buildPlainTextPdf(text: string): Uint8Array {
  const linesPerPage = Math.floor((PAGE_HEIGHT - MARGIN_TOP * 2) / LINE_HEIGHT);
  const pages = chunkLines(wrapText(text), linesPerPage);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<<>>");
  const pagesId = addObject("<<>>");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  for (const pageLines of pages) {
    const stream = pageContentStream(pageLines);
    const contentId = addObject(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    );
    contentObjectIds.push(contentId);
    const pageId = addObject("<<>>");
    pageObjectIds.push(pageId);
  }

  for (let i = 0; i < pageObjectIds.length; i += 1) {
    const pageId = pageObjectIds[i]!;
    const contentId = contentObjectIds[i]!;
    objects[pageId - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
  }

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[pagesId - 1] = `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageObjectIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}
