import { transliterateToAscii } from './transliterateToAscii';

export type AddressLatinRole = 'street' | 'city' | 'postal';

/**
 * Normalizes address lines for professional Latin/ASCII storage: runs
 * {@link transliterateToAscii} first so non-Latin scripts (CJK, Arabic,
 * Cyrillic, Greek, Hebrew, Devanagari, Thai, etc.) map to Latin letters via the
 * Unicode transliteration tables, then applies role-specific whitelists. Does
 * not translate place-name meanings (e.g. no München → Munich).
 */
export function normalizeLatinAddressLine(raw: string, role: AddressLatinRole): string {
  let s = transliterateToAscii(raw);

  if (role === 'postal') {
    return s.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
  }

  if (role === 'street') {
    return s.replace(/[^A-Za-z0-9\s.,'/#\-&()]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return s.replace(/[^A-Za-z0-9\s.,'()\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
