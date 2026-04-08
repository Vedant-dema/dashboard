import { transliterateAddressToAscii } from './addressTransliterate';

export type AddressLatinRole = 'street' | 'city' | 'postal';

/**
 * Title-case Latin letters for VIES-derived street/city (transliteration often
 * leaves ALL CAPS or mixed casing). Preserves all-digit tokens and numeric hyphen segments.
 */
export function titleCaseLatinAddressLine(s: string): string {
  const t = s.trim();
  if (!t) return s;
  return t
    .split(/\s+/)
    .map((tok) => {
      if (/^\d+([,.]\d+)*$/.test(tok)) return tok;
      if (/^\d+[A-Za-z]?$/.test(tok)) return tok;
      return tok
        .split('-')
        .map((seg) => {
          if (/^\d+$/.test(seg)) return seg;
          if (!/[A-Za-z]/.test(seg)) return seg;
          const lower = seg.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('-');
    })
    .join(' ');
}

/**
 * Normalizes address lines for professional Latin/ASCII storage: runs
 * {@link transliterateAddressToAscii} first so non-Latin scripts (CJK, Arabic,
 * Cyrillic, Greek, Hebrew, Devanagari, Thai, etc.) map to Latin letters via the
 * Unicode transliteration tables, then applies role-specific whitelists. Does
 * not translate place-name meanings (e.g. no München → Munich).
 */
export function normalizeLatinAddressLine(raw: string, role: AddressLatinRole): string {
  let s = transliterateAddressToAscii(raw);

  if (role === 'postal') {
    return s.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
  }

  if (role === 'street') {
    return s.replace(/[^A-Za-z0-9\s.,'/#\-&()]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return s.replace(/[^A-Za-z0-9\s.,'()\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
