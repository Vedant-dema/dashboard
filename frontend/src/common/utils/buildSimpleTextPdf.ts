/**
 * Minimal single-page PDF (Helvetica) for demo invoice previews.
 * Non-ASCII and PDF-special characters in lines are sanitized to keep the file valid.
 */

function toAsciiPrintable(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, "?");
}

function pdfEscapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxLen: number): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= maxLen) return [t];
  const words = t.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxLen) cur = next;
    else {
      if (cur) out.push(cur);
      cur = w.length > maxLen ? w.slice(0, maxLen) : w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function buildStreamContent(lines: string[]): string {
  const flat: string[] = [];
  for (const line of lines) {
    for (const part of wrapLine(line, 95)) {
      flat.push(pdfEscapeText(toAsciiPrintable(part)));
    }
  }
  const ops = ["BT", "/F1 11 Tf", "72 720 Td"];
  flat.forEach((line, i) => {
    if (i > 0) ops.push("0 -14 Td");
    ops.push(`(${line}) Tj`);
  });
  ops.push("ET");
  return ops.join("\n");
}

export function buildSimpleTextPdf(lines: string[]): Blob {
  const streamBody = buildStreamContent(lines);
  const streamPayload = `${streamBody}\n`;
  const streamLen = new TextEncoder().encode(streamPayload).length;

  let pdf = "";
  const objOffsets: number[] = [];

  const add = (s: string) => {
    pdf += s;
  };

  add("%PDF-1.4\n");

  objOffsets[1] = new TextEncoder().encode(pdf).length;
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  objOffsets[2] = new TextEncoder().encode(pdf).length;
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  objOffsets[3] = new TextEncoder().encode(pdf).length;
  add(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n"
  );

  objOffsets[4] = new TextEncoder().encode(pdf).length;
  add(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n`);
  pdf += `${streamPayload}endstream\nendobj\n`;

  objOffsets[5] = new TextEncoder().encode(pdf).length;
  add("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  const xrefStart = new TextEncoder().encode(pdf).length;
  add("xref\n0 6\n");
  add("0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) {
    add(`${String(objOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  add("trailer\n<< /Size 6 /Root 1 0 R >>\n");
  add(`startxref\n${xrefStart}\n%%EOF\n`);

  return new Blob([pdf], { type: "application/pdf" });
}
