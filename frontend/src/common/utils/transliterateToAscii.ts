import { transliterate as transliterateWide } from 'transliteration';

// #region agent log
const _dbg = (hypothesisId: string, location: string, message: string, data: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7681/ingest/be26f82e-3233-4622-be13-a1faf77019bb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f4aed6' },
    body: JSON.stringify({
      sessionId: 'f4aed6',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

/**
 * True when the segment still contains Greek (before wide transliteration).
 * Used to apply phonetic refinements the `transliteration` package often misses (αυ→av, ου→ou).
 */
function sourceHasGreek(text: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
}

/**
 * After letter-by-letter Greek→Latin, fix common diphthong artifacts (library uses Y/OY where
 * modern Greek romanisation uses V/OU between consonants). Only safe when we know input was Greek.
 */
function refineGreekLatinTransliteration(ascii: string): string {
  let t = ascii;
  t = t.replace(/AYR/g, 'AVR').replace(/ayr/g, 'avr');
  const C = '[BCDFGHJKLMNPQRSTVWXYZ]';
  const c = '[bcfghjklmnpqrstvwxyz]';
  t = t.replace(new RegExp(`(?<=${C})OY(?=${C})`, 'g'), 'OU');
  t = t.replace(new RegExp(`(?<=${c})oy(?=${c})`, 'g'), 'ou');
  return t;
}

/**
 * DIN-style German umlaut expansion before wide-script transliteration so
 * e.g. "Müller" becomes "Mueller" (not only "Muller" from accent stripping).
 */
function expandGermanUmlauts(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/\u00df/g, 'ss')
    .replace(/\u1e9e/g, 'SS');
}

function cleanupSegment(s: string): string {
  let t = s.normalize('NFKC');
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  t = t.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');
  t = t.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  t = t.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  t = t.replace(/[\u2013\u2014\u2212]/g, '-');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

type TransliterateOpts = { fixChineseSpacing?: boolean; unknown?: string };

function foldSegmentWithOpts(segment: string, opts?: TransliterateOpts): string {
  const s = cleanupSegment(segment);
  if (!s) return '';
  const hadGreek = sourceHasGreek(s);
  let u = expandGermanUmlauts(s);
  u = opts ? transliterateWide(u, opts) : transliterateWide(u);
  u = u.normalize('NFD').replace(/\p{M}/gu, '');
  u = expandGermanUmlauts(u);
  let out = u.replace(/\s+/g, ' ').trim();
  const beforeRefine = out;
  if (hadGreek) {
    out = refineGreekLatinTransliteration(out);
  }
  // #region agent log
  if (hadGreek || /PLATY|DIAST|KOUL|GERMANOS|ΠΛΑΤΥ/i.test(segment)) {
    _dbg('H1', 'transliterateToAscii.ts:foldSegmentWithOpts', 'greek fold path', {
      hadGreek,
      optsKey: opts ? JSON.stringify(opts) : 'default',
      inSample: s.slice(0, 80),
      beforeRefine: beforeRefine.slice(0, 120),
      afterRefine: out.slice(0, 120),
    });
  }
  // #endregion
  return out;
}

function foldSegment(segment: string): string {
  return foldSegmentWithOpts(segment);
}

/**
 * On-device “variant” spellings (no API): same pipeline with alternate `transliteration`
 * options so CJK and rare characters can differ slightly (e.g. spaced vs compact pinyin).
 * Deduped; always includes the canonical {@link transliterateToAscii} result first.
 */
export function localLatinNameVariants(raw: string): string[] {
  const flat = raw.replace(/\r\n|\r|\n/g, ' ');
  const candidates = [
    foldSegmentWithOpts(flat),
    foldSegmentWithOpts(flat, { fixChineseSpacing: false }),
    foldSegmentWithOpts(flat, { unknown: ' ', fixChineseSpacing: true }),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of candidates) {
    const t = v.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

/**
 * Single-line text: NFKC cleanup, German umlaut expansion (ä→ae, …), then the
 * `transliteration` package’s full Unicode tables (major scripts worldwide:
 * Greek, Cyrillic, Arabic, Hebrew, CJK, Korean, Thai, Devanagari, etc.) to
 * Latin, then Latin mark stripping. Does not translate word meanings.
 */
export function transliterateToAscii(raw: string): string {
  const flat = raw.replace(/\r\n|\r|\n/g, ' ');
  return foldSegment(flat);
}

/**
 * Preserves newline boundaries; each line is transliterated like {@link transliterateToAscii}.
 */
export function transliterateToAsciiMultiline(raw: string): string {
  return raw
    .split(/\r\n|\r|\n/g)
    .map((line) => foldSegment(line))
    .join('\n');
}
