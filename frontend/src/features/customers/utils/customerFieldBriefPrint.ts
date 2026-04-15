import type { KundenAdresse, KundenKontakt, KundenStamm } from "../../../types/kunden";
import html2pdf from "html2pdf.js";

export type CustomerBriefRow = { label: string; value: string };

export type CustomerBriefSection = { title: string; rows: CustomerBriefRow[] };

type Translate = (key: string, englishFallback: string) => string;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safe download filename (Windows / macOS / web). */
export function sanitizeCustomerFieldBriefPdfFilename(name: string): string {
  const trimmed = name.trim() || "DEMA-field-brief.pdf";
  const withPdf = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  return withPdf.replace(/[/\\?%*:|"<>]/g, "-");
}

function pushRow(
  rows: CustomerBriefRow[],
  label: string,
  value: string | number | null | undefined,
  trim = true
) {
  if (value === null || value === undefined) return;
  const s = typeof value === "number" ? String(value) : value;
  const v = trim ? s.trim() : s;
  if (!v) return;
  rows.push({ label, value: v });
}

function customerTypeLabel(kunde: KundenStamm, t: Translate): string | null {
  const ty = kunde.customer_type;
  if (ty === "legal_entity") return t("customersFieldBriefCustomerLegal", "Legal entity");
  if (ty === "natural_person") return t("customersFieldBriefCustomerNatural", "Natural person");
  return null;
}

function buildAddressBlock(kunde: KundenStamm): string {
  const lines: string[] = [];
  const primary = [kunde.strasse, [kunde.plz, kunde.ort].filter(Boolean).join(" ").trim(), kunde.land_code]
    .filter(Boolean)
    .join("\n");
  if (primary.trim()) lines.push(primary.trim());

  const extra = (kunde.adressen ?? []).slice(1);
  for (const a of extra) {
    const block = [a.strasse, [a.plz, a.ort].filter(Boolean).join(" ").trim(), a.land_code]
      .filter(Boolean)
      .join("\n");
    if (block.trim()) lines.push(block.trim());
  }
  return lines.join("\n\n");
}

function formatOneAdresse(a: KundenAdresse, t: Translate): string {
  const lines: string[] = [];
  if (a.strasse?.trim()) lines.push(a.strasse.trim());
  const cityLine = [a.plz, a.ort].filter(Boolean).join(" ").trim();
  if (cityLine) lines.push(cityLine);
  if (a.land_code?.trim()) lines.push(`${t("newCustomerLabelLand", "Country")}: ${a.land_code.trim()}`);
  const artLand = a.art_land_code?.trim();
  if (artLand) lines.push(`${t("historyFieldArtLand", "Account country")}: ${artLand}`);
  const ust = a.ust_id_nr?.trim();
  const st = a.steuer_nr?.trim();
  const br = a.branchen_nr?.trim();
  if (ust) lines.push(`${t("customersFilterUstId", "VAT ID")}: ${ust}`);
  if (st) lines.push(`${t("historyFieldSteuerNr", "Tax number")}: ${st}`);
  if (br) lines.push(`${t("historyFieldBranchenNr", "Industry no.")}: ${br}`);
  return lines.join("\n");
}

/** Digits only — compare landlines / mobiles without formatting noise. */
function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Join dial code + number for PDF display. Avoids "+49 +49 40 …" when `telefon` already starts with the code.
 * When the subscriber number is empty, returns "" (not the bare dial code) so empty contact slots stay hidden.
 */
function joinTelCodeAndNumber(code: string, num: string): string {
  const c = code.trim();
  const n = num.trim();
  /* Empty cards often store only a default dial code (e.g. +49) with no number — do not show as a phone line. */
  if (!n) return "";
  if (!c) return n;
  const cCompact = c.replace(/\s/g, "");
  const nCompact = n.replace(/\s/g, "");
  if (nCompact.startsWith(cCompact) || n.trimStart().startsWith(c)) return n.trim();
  return `${c} ${n}`.trim().replace(/\s+/g, " ");
}

function formatKontaktPhoneLines(c: KundenKontakt): { tel: string; mob: string } {
  const tel = joinTelCodeAndNumber(c.telefonCode ?? "", c.telefon ?? "").trim();
  const mob = joinTelCodeAndNumber(c.handyCode ?? "", c.handy ?? "").trim();
  return { tel, mob };
}

/**
 * True when this `kontakte` row is the same person as the master Stamm contact (modal often mirrors the first card).
 */
function kontaktDuplicatesMaster(c: KundenKontakt, kunde: KundenStamm): boolean {
  const mName = (kunde.ansprechpartner ?? "").trim().toLowerCase();
  const cName = c.name.trim().toLowerCase();
  if (!mName || !cName || cName !== mName) return false;

  const mR = (kunde.rolle_kontakt ?? "").trim().toLowerCase();
  const cR = c.rolle.trim().toLowerCase();
  if (mR && cR && mR !== cR) return false;

  const mTel = phoneDigits(kunde.telefonnummer ?? "");
  const cTel = phoneDigits(joinTelCodeAndNumber(c.telefonCode ?? "", c.telefon ?? ""));
  if (mTel.length >= 6 && cTel.length >= 6 && mTel !== cTel) return false;

  const mMail = (kunde.email ?? "").trim().toLowerCase();
  const cMail = c.email.trim().toLowerCase();
  if (mMail && cMail && mMail !== cMail) return false;

  return true;
}

/** One saved contact card (modal `kontakte` row). */
function formatKontaktCard(c: KundenKontakt, t: Translate): string {
  const lines: string[] = [];
  if (c.name.trim()) lines.push(c.name.trim());
  if (c.rolle.trim()) {
    lines.push(`${t("newCustomerLabelRolle", "Function / Role")}: ${c.rolle.trim()}`);
  }
  const { tel, mob } = formatKontaktPhoneLines(c);
  if (tel) lines.push(`${t("customersLabelPhone", "Phone")}: ${tel}`);
  if (mob) lines.push(`${t("newCustomerLabelHandy", "Mobile")}: ${mob}`);
  if (c.email.trim()) lines.push(`${t("historyFieldEmail", "E-mail")}: ${c.email.trim()}`);
  if (c.website?.trim()) {
    lines.push(`${t("customersFieldBriefLabelContactWebsite", "Contact website")}: ${c.website.trim()}`);
  }
  if (c.bemerkung.trim()) {
    lines.push(`${t("newCustomerLabelKontaktBemerkung", "Note")}: ${c.bemerkung.trim()}`);
  }
  return lines.join("\n");
}

/** Primary company contact fields on the master record (not the `kontakte` list). */
function formatMasterContactBlock(kunde: KundenStamm, t: Translate): string {
  const lines: string[] = [];
  if (kunde.ansprechpartner?.trim()) lines.push(kunde.ansprechpartner.trim());
  if (kunde.rolle_kontakt?.trim()) {
    lines.push(`${t("newCustomerLabelRolle", "Function / Role")}: ${kunde.rolle_kontakt.trim()}`);
  }
  if (kunde.telefonnummer?.trim()) {
    lines.push(`${t("customersLabelPhone", "Phone")}: ${kunde.telefonnummer.trim()}`);
  }
  if (kunde.faxnummer?.trim()) {
    lines.push(`${t("historyFieldFax", "Fax")}: ${kunde.faxnummer.trim()}`);
  }
  if (kunde.email?.trim()) {
    lines.push(`${t("historyFieldEmail", "E-mail")}: ${kunde.email.trim()}`);
  }
  if (kunde.bemerkungen_kontakt?.trim()) {
    lines.push(`${t("historyFieldBemerkungenKontakt", "Contact notes")}: ${kunde.bemerkungen_kontakt.trim()}`);
  }
  return lines.join("\n").trim();
}

function buildPeopleRows(kunde: KundenStamm, t: Translate): CustomerBriefRow[] {
  const rows: CustomerBriefRow[] = [];
  const master = formatMasterContactBlock(kunde, t);
  if (master) {
    rows.push({
      label: t("customersFieldBriefLabelPrimaryContactBlock", "Primary contact (master data)"),
      value: master,
    });
  }
  const kontakte = kunde.kontakte ?? [];
  let shown = 0;
  kontakte.forEach((c) => {
    if (kontaktDuplicatesMaster(c, kunde)) return;
    const block = formatKontaktCard(c, t);
    if (!block.trim()) return;
    shown += 1;
    const title = t("newCustomerKontaktDefaultLabel", "Contact {n}").replace("{n}", String(shown));
    rows.push({ label: title, value: block.trim() });
  });
  return rows;
}

function buildLocationRows(kunde: KundenStamm, t: Translate): CustomerBriefRow[] {
  const rows: CustomerBriefRow[] = [];
  const adr = kunde.adressen ?? [];
  if (adr.length > 0) {
    adr.forEach((a, idx) => {
      const typ = a.typ?.trim();
      const label = typ
        ? `${t("customer360StripAddress", "Address")} ${idx + 1} — ${typ}`
        : `${t("customer360StripAddress", "Address")} ${idx + 1}`;
      const val = formatOneAdresse(a, t);
      if (val.trim()) rows.push({ label, value: val });
    });
  } else {
    const fallback = buildAddressBlock(kunde);
    if (fallback.trim()) rows.push({ label: t("customer360StripAddress", "Address"), value: fallback.trim() });
  }
  return rows;
}

/**
 * Builds printable sections for the field handout PDF: master company data, all addresses,
 * and contact persons (master + `kontakte`). Appointments are omitted from this handout.
 */
export function buildCustomerFieldBriefSections(kunde: KundenStamm, t: Translate): CustomerBriefSection[] {
  const identity: CustomerBriefRow[] = [];
  pushRow(identity, t("newCustomerLabelFirmenvorsatz", "Company prefix"), kunde.firmenvorsatz);
  pushRow(identity, t("customersLabelCompany", "Company name"), kunde.firmenname);
  const personLine = [kunde.first_name, kunde.last_name].filter(Boolean).join(" ").trim();
  if (personLine) pushRow(identity, t("customerModalColKontakt", "Contact person"), personLine);
  const ct = customerTypeLabel(kunde, t);
  if (ct) pushRow(identity, t("customersFieldBriefLabelCustomerType", "Customer type"), ct);
  pushRow(identity, t("historyFieldArtKunde", "Customer type"), kunde.art_kunde);
  pushRow(identity, t("newCustomerLabelBuchungskonto", "Main booking account"), kunde.buchungskonto_haupt);
  pushRow(identity, t("historyFieldSteuerNr", "Tax number"), kunde.steuer_nr);
  pushRow(identity, t("historyFieldBranchenNr", "Industry no."), kunde.branchen_nr);
  pushRow(identity, t("historyFieldWebsite", "Website"), kunde.internet_adr);

  const locations = buildLocationRows(kunde, t);
  const peopleRows = buildPeopleRows(kunde, t);

  const sections: CustomerBriefSection[] = [
    { title: t("customersFieldBriefSectionIdentity", "Company & master data"), rows: identity },
    { title: t("customersFieldBriefSectionLocations", "Sites & registered addresses"), rows: locations },
    { title: t("customersFieldBriefSectionPeople", "Contacts & phone tree"), rows: peopleRows },
  ];

  return sections.filter((s) => s.rows.length > 0);
}

export type CustomerFieldBriefHtmlOpts = {
  lang: string;
  windowTitle: string;
  headline: string;
  letterheadTagline: string;
  sections: CustomerBriefSection[];
  /** Optional; omitted or empty = no footer line in the PDF. */
  footerNote?: string;
};

function buildBodySectionsHtml(sections: CustomerBriefSection[]): string {
  return sections
    .map((sec) => {
      const rows = sec.rows
        .map(
          (r) =>
            `<tr><th scope="row">${escapeHtml(r.label)}</th><td>${escapeHtml(r.value).replace(/\n/g, "<br/>")}</td></tr>`
        )
        .join("");
      return `<section class="block"><h2>${escapeHtml(sec.title)}</h2><table>${rows}</table></section>`;
    })
    .join("");
}

/** Full HTML document for the field handout (letterhead + sections). Used for client-side PDF. */
export function buildCustomerFieldBriefHtml(opts: CustomerFieldBriefHtmlOpts): string {
  const { lang, windowTitle, headline, letterheadTagline, sections } = opts;
  const footerNote = opts.footerNote?.trim() ?? "";
  const bodySections = buildBodySectionsHtml(sections);
  const footerHtml = footerNote
    ? `<p class="doc-footer-note">${escapeHtml(footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(windowTitle)}</title>
<style>
  @page { size: A4; margin: 12mm 14mm 14mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #0f172a;
    background: #fff;
  }
  .sheet { max-width: 190mm; margin: 0 auto; padding: 0 0 10mm; }

  /* Corporate letterhead — DE/MA wordmark + tagline only (no raster logo). */
  .dema-letterhead {
    display: block;
    padding-bottom: 8pt;
    margin-bottom: 0;
  }
  .dema-logo-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 4pt;
    line-height: 1;
    margin: 0 0 5pt 0;
  }
  .dema-logo-line .de {
    font-size: 32pt;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #1a2744;
  }
  .dema-logo-line .ma {
    font-size: 32pt;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #e30613;
  }
  .dema-logo-line .suffix {
    font-size: 11.5pt;
    font-weight: 600;
    color: #0f172a;
    margin-left: 6pt;
    letter-spacing: 0.01em;
  }
  .dema-tagline {
    margin: 0;
    font-size: 8.5pt;
    font-weight: 600;
    color: #1e293b;
    letter-spacing: 0.02em;
    max-width: 52rem;
  }
  .dema-rule {
    border: none;
    border-top: 1.5pt solid #0f172a;
    margin: 0 0 12pt 0;
  }

  .doc-header { padding-bottom: 8pt; margin-bottom: 10pt; border-bottom: 0.5pt solid #cbd5e1; }
  h1 { font-size: 16pt; font-weight: 700; margin: 0; letter-spacing: -0.02em; color: #0f172a; }
  .block { margin-top: 12pt; page-break-inside: avoid; }
  h2 {
    font-size: 9pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #1e3a5f;
    border-left: 3pt solid #2563eb;
    padding-left: 8pt;
    margin: 0 0 6pt;
  }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th {
    text-align: left;
    vertical-align: top;
    width: 32%;
    padding: 5pt 10pt 5pt 0;
    font-weight: 600;
    color: #334155;
    border-bottom: 0.5pt solid #e2e8f0;
  }
  td {
    vertical-align: top;
    padding: 5pt 0;
    border-bottom: 0.5pt solid #e2e8f0;
    word-break: break-word;
  }
  .doc-footer-note {
    margin-top: 16pt;
    padding-top: 6pt;
    border-top: 0.5pt solid #e2e8f0;
    font-size: 8pt;
    color: #64748b;
    line-height: 1.35;
  }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .dema-letterhead { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="dema-letterhead">
      <div class="dema-logo-line" aria-label="DEMA GmbH &amp; Co. KG">
        <span class="de">DE</span><span class="ma">MA</span><span class="suffix">GmbH &amp; Co. KG</span>
      </div>
      <p class="dema-tagline">${escapeHtml(letterheadTagline)}</p>
    </div>
    <hr class="dema-rule" />
    <header class="doc-header">
      <h1>${escapeHtml(headline)}</h1>
    </header>
    ${bodySections}
    ${footerHtml}
  </div>
</body>
</html>`;
}

export type DownloadCustomerFieldBriefPdfOpts = CustomerFieldBriefHtmlOpts & {
  /** Suggested download name, e.g. `DEMA-field-brief_10001.pdf` */
  filename: string;
};

const PDF_CAPTURE_HOST_ATTR = "data-dema-field-brief-pdf-host";

/**
 * Mounts letterhead HTML in the **current document** (off-screen). html2canvas reads
 * computed styles from the live tree — more reliable than blob iframes (Firefox/Safari).
 */
function mountFieldBriefPdfHost(html: string): { root: HTMLElement; cleanup: () => void } | null {
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null;
  }
  const sheet = parsed.querySelector(".sheet");
  if (!sheet || !(sheet instanceof HTMLElement)) return null;

  const host = document.createElement("div");
  host.setAttribute(PDF_CAPTURE_HOST_ATTR, "");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    /* ~A4 width at 96dpi — gives html2canvas a stable box (avoid 0×0 in some engines) */
    width: "794px",
    maxWidth: "794px",
    zIndex: "2147483646",
    opacity: "1",
    pointerEvents: "none",
    overflow: "visible",
    background: "#ffffff",
    boxSizing: "border-box",
  });

  parsed.head.querySelectorAll("style").forEach((node) => {
    host.appendChild(node.cloneNode(true));
  });
  host.appendChild(sheet.cloneNode(true));

  const root = host.querySelector(".sheet");
  if (!root || !(root instanceof HTMLElement)) {
    host.remove();
    return null;
  }

  document.body.appendChild(host);

  const cleanup = () => {
    host.remove();
  };

  return { root, cleanup };
}

async function waitForPdfPaint(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }
  await new Promise<void>((r) => {
    requestAnimationFrame(() => r());
  });
  await new Promise<void>((r) => {
    requestAnimationFrame(() => r());
  });
  await new Promise<void>((r) => {
    window.setTimeout(r, 220);
  });
}

function html2CanvasOptsForFieldBrief(): Record<string, unknown> {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  /* Cap scale to reduce OOM on large handouts; 1.5 is enough for crisp A4 */
  const scale = Math.min(2, Math.max(1, Math.round(dpr * 10) / 10));
  return {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    allowTaint: true,
    scrollX: 0,
    scrollY: 0,
    foreignObjectRendering: false,
    imageTimeout: 15000,
  };
}

async function runHtml2PdfSave(root: HTMLElement, filename: string, cleanup: () => void): Promise<boolean> {
  try {
    void root.offsetHeight;
    await waitForPdfPaint();

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: html2CanvasOptsForFieldBrief(),
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(root)
      .save();
    return true;
  } catch (err) {
    console.error("[DEMA] customer field brief PDF failed", err);
    return false;
  } finally {
    cleanup();
  }
}

/**
 * Saves a PDF via html2pdf.js. Prefers an in-document off-screen mount (browser-friendly);
 * falls back to a blob iframe if parsing/mount fails.
 */
export async function downloadCustomerFieldBriefPdf(opts: DownloadCustomerFieldBriefPdfOpts): Promise<boolean> {
  const html = buildCustomerFieldBriefHtml(opts);
  const filename = sanitizeCustomerFieldBriefPdfFilename(opts.filename);

  document.querySelectorAll(`[${PDF_CAPTURE_HOST_ATTR}]`).forEach((n) => n.remove());

  const mounted = mountFieldBriefPdfHost(html);
  if (mounted) {
    const ok = await runHtml2PdfSave(mounted.root, filename, mounted.cleanup);
    if (ok) return true;
    /* cleanup already ran in runHtml2PdfSave; continue to iframe fallback */
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    width: "794px",
    minHeight: "1123px",
    opacity: "1",
    pointerEvents: "none",
    border: "0",
    zIndex: "2147483645",
    background: "#fff",
  });
  document.body.appendChild(iframe);

  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));

  const disposeIframe = () => {
    URL.revokeObjectURL(blobUrl);
    iframe.remove();
  };

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("iframe load failed"));
      iframe.src = blobUrl;
    });

    const idoc = iframe.contentDocument;
    const root = idoc?.body?.querySelector(".sheet");
    if (!root || !(root instanceof HTMLElement)) {
      disposeIframe();
      return false;
    }

    return await runHtml2PdfSave(root, filename, disposeIframe);
  } catch (err) {
    console.error("[DEMA] customer field brief PDF iframe fallback failed", err);
    disposeIframe();
    return false;
  }
}
