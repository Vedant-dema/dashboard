import { transliterateToAscii } from "./transliterateToAscii";

/**
 * Scientific transliteration of Bulgarian Cyrillic letters (ASCII output).
 * Does not translate words — character mapping only.
 */
const BG_CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  А: "A",
  а: "a",
  Б: "B",
  б: "b",
  В: "V",
  в: "v",
  Г: "G",
  г: "g",
  Д: "D",
  д: "d",
  Е: "E",
  е: "e",
  Ж: "Zh",
  ж: "zh",
  З: "Z",
  з: "z",
  И: "I",
  и: "i",
  Й: "Y",
  й: "y",
  К: "K",
  к: "k",
  Л: "L",
  л: "l",
  М: "M",
  м: "m",
  Н: "N",
  н: "n",
  О: "O",
  о: "o",
  П: "P",
  п: "p",
  Р: "R",
  р: "r",
  С: "S",
  с: "s",
  Т: "T",
  т: "t",
  У: "U",
  у: "u",
  Ф: "F",
  ф: "f",
  Х: "H",
  х: "h",
  Ц: "Ts",
  ц: "ts",
  Ч: "Ch",
  ч: "ch",
  Ш: "Sh",
  ш: "sh",
  Щ: "Sht",
  щ: "sht",
  Ъ: "A",
  ъ: "a",
  Ь: "Y",
  ь: "y",
  Ю: "Yu",
  ю: "yu",
  Я: "Ya",
  я: "ya",
  ѝ: "i",
  Ѝ: "I",
};

const CYRILLIC_BLOCK = /[\u0400-\u04FF]/;

/**
 * Expand common BG address abbreviations (Cyrillic) before generic transliteration so
 * `transliteration` does not turn e.g. "ЖК" into "Jk".
 */
function expandCyrillicAddressAbbreviations(text: string): string {
  let t = text.normalize("NFKC");
  const pairs: [RegExp, string][] = [
    [/ж\s*\.\s*к\s*\./giu, "Zh.K."],
    [/(\s|^)жк([\s,.;]|$)/giu, "$1Zh.K.$2"],
    [/обл\s*\./giu, "obl."],
    [/гр\s*\./giu, "gr."],
    [/бл\s*\./giu, "bl."],
    [/вх\s*\./giu, "vh."],
    [/ет\s*\./giu, "et."],
    [/ап\s*\./giu, "ap."],
    [/ул\s*\./giu, "ul."],
    [/пл\s*\./giu, "pl."],
    [/кв\s*\./giu, "kv."],
  ];
  for (const [re, rep] of pairs) {
    t = t.replace(re, rep);
  }
  return t;
}

function mapBulgarianCyrillicToLatin(text: string): string {
  let out = "";
  for (const ch of text) {
    out += BG_CYRILLIC_TO_LATIN[ch] ?? ch;
  }
  return out;
}

/**
 * Address lines only: deterministic BG-friendly handling, then generic ASCII fold for
 * other scripts. Does not translate word meanings; keeps Latin abbreviations stable.
 */
export function transliterateAddressToAscii(raw: string): string {
  const flat = raw.replace(/\r\n|\r|\n/g, " ");
  let t = expandCyrillicAddressAbbreviations(flat);
  if (CYRILLIC_BLOCK.test(t)) {
    t = mapBulgarianCyrillicToLatin(t);
  }
  return transliterateToAscii(t);
}

/** Preserve newlines; each line uses {@link transliterateAddressToAscii}. */
export function transliterateAddressToAsciiMultiline(raw: string): string {
  return raw
    .split(/\r\n|\r|\n/g)
    .map((line) => transliterateAddressToAscii(line))
    .join("\n");
}
