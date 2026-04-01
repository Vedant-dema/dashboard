import { transliterate as transliterateWide } from "transliteration";

const COMBINING_MARKS = /\p{M}/gu;
const NON_ASCII_PRINTABLE = /[^\x20-\x7E]/g;
const ASCII_PRINTABLE = /^[\x20-\x7E]*$/;
const GREEK_SCRIPT = /[\u0370-\u03FF\u1F00-\u1FFF]/;

const LATIN_ASCII_OVERRIDES: Readonly<Record<string, string>> = {
  "\u00c4": "Ae",
  "\u00d6": "Oe",
  "\u00dc": "Ue",
  "\u00e4": "ae",
  "\u00f6": "oe",
  "\u00fc": "ue",
  "\u00df": "ss",
  "\u1e9e": "SS",
  "\u00c6": "AE",
  "\u00e6": "ae",
  "\u0152": "OE",
  "\u0153": "oe",
  "\u00d8": "O",
  "\u00f8": "o",
  "\u00c5": "A",
  "\u00e5": "a",
  "\u00d0": "D",
  "\u00f0": "d",
  "\u0110": "D",
  "\u0111": "d",
  "\u00de": "Th",
  "\u00fe": "th",
  "\u0141": "L",
  "\u0142": "l",
  "\u0131": "i",
  "\u0132": "IJ",
  "\u0133": "ij",
  "\u014a": "N",
  "\u014b": "n",
  "\u0126": "H",
  "\u0127": "h",
  "\u0166": "T",
  "\u0167": "t",
  "\u018f": "E",
  "\u0259": "e",
  "\u0192": "f",
  "\u0149": "n",
  "\u0138": "k",
};

const GREEK_SEQUENCE_OVERRIDES: ReadonlyArray<[RegExp, string]> = [
  [/ΑΥ/g, "AV"],
  [/Αυ/g, "Av"],
  [/αυ/g, "av"],
  [/ΕΥ/g, "EV"],
  [/Ευ/g, "Ev"],
  [/ευ/g, "ev"],
  [/ΗΥ/g, "IV"],
  [/Ηυ/g, "Iv"],
  [/ηυ/g, "iv"],
  [/ΟΥ/g, "OU"],
  [/Ου/g, "Ou"],
  [/ου/g, "ou"],
];

export type TransliterateOpts = { fixChineseSpacing?: boolean; unknown?: string };

export type AsciiCharacterComparison = {
  source: string;
  ascii: string;
  changed: boolean;
  sourceCodePoint: string;
  strategy: "ascii" | "compatibility" | "override" | "library" | "fallback";
};

function isAsciiPrintable(value: string): boolean {
  return ASCII_PRINTABLE.test(value);
}

function toAsciiCodePoint(ch: string): string {
  return `U+${ch.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") ?? "0000"}`;
}

function cleanupSegment(raw: string): string {
  let text = raw.normalize("NFKC");
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  text = text.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");
  text = text.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  text = text.replace(/[\u2013\u2014\u2212]/g, "-");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function stripLatinMarks(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "");
}

function finalizeAscii(text: string, unknown = ""): string {
  return text.replace(NON_ASCII_PRINTABLE, unknown);
}

function applyGreekSequenceOverrides(text: string): string {
  if (!GREEK_SCRIPT.test(text)) return text;
  return GREEK_SEQUENCE_OVERRIDES.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text
  );
}

function applyLatinOverridesToSegment(text: string): string {
  return Array.from(text, (source) => LATIN_ASCII_OVERRIDES[source] ?? source).join("");
}

function transliterateCharacter(source: string, opts?: TransliterateOpts): AsciiCharacterComparison {
  if (isAsciiPrintable(source)) {
    return {
      source,
      ascii: source,
      changed: false,
      sourceCodePoint: toAsciiCodePoint(source),
      strategy: "ascii",
    };
  }

  const override = LATIN_ASCII_OVERRIDES[source];
  if (override !== undefined) {
    return {
      source,
      ascii: override,
      changed: true,
      sourceCodePoint: toAsciiCodePoint(source),
      strategy: "override",
    };
  }

  const compatibility = finalizeAscii(stripLatinMarks(source));
  if (compatibility && isAsciiPrintable(compatibility)) {
    return {
      source,
      ascii: compatibility,
      changed: compatibility !== source,
      sourceCodePoint: toAsciiCodePoint(source),
      strategy: "compatibility",
    };
  }

  let wide = opts ? transliterateWide(source, opts) : transliterateWide(source);
  wide = stripLatinMarks(wide);
  wide = finalizeAscii(wide, opts?.unknown ?? "");
  if (wide) {
    return {
      source,
      ascii: wide,
      changed: wide !== source,
      sourceCodePoint: toAsciiCodePoint(source),
      strategy: "library",
    };
  }

  return {
    source,
    ascii: opts?.unknown ?? "",
    changed: true,
    sourceCodePoint: toAsciiCodePoint(source),
    strategy: "fallback",
  };
}

export function compareCharactersToAscii(
  raw: string,
  opts?: TransliterateOpts
): AsciiCharacterComparison[] {
  return Array.from(cleanupSegment(raw), (source) => transliterateCharacter(source, opts));
}

function foldSegmentWithOpts(segment: string, opts?: TransliterateOpts): string {
  const clean = cleanupSegment(segment);
  if (!clean) return "";

  const prepared = applyLatinOverridesToSegment(applyGreekSequenceOverrides(clean));
  let output = opts ? transliterateWide(prepared, opts) : transliterateWide(prepared);
  output = stripLatinMarks(output);
  output = finalizeAscii(output, opts?.unknown ?? "");

  return output.replace(/\s+/g, " ").trim();
}

function foldSegment(segment: string): string {
  return foldSegmentWithOpts(segment);
}

/**
 * On-device variant spellings: same pipeline with alternate `transliteration`
 * options so rare-script output can be compared and deduped without
 * translating word meaning.
 */
export function localLatinNameVariants(raw: string): string[] {
  const flat = raw.replace(/\r\n|\r|\n/g, " ");
  const candidates = [
    foldSegmentWithOpts(flat),
    foldSegmentWithOpts(flat, { fixChineseSpacing: false }),
    foldSegmentWithOpts(flat, { unknown: " ", fixChineseSpacing: true }),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

/**
 * Converts any Unicode text to printable ASCII by comparing each source
 * character with its closest ASCII form. It does not translate word meaning;
 * it only normalizes letters, marks, and script-specific glyphs.
 */
export function transliterateToAscii(raw: string): string {
  const flat = raw.replace(/\r\n|\r|\n/g, " ");
  return foldSegment(flat);
}

/**
 * Preserves newline boundaries while converting each line to printable ASCII.
 */
export function transliterateToAsciiMultiline(raw: string): string {
  return raw
    .split(/\r\n|\r|\n/g)
    .map((line) => foldSegment(line))
    .join("\n");
}
