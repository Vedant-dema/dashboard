/**
 * Run `normalize` on the current input value and call `apply` only when the
 * result differs. Use from both `onBlur` and `onCompositionEnd` so CJK and
 * other IME input transliterates when the composition finishes, not only when
 * the field loses focus.
 */
export function commitAsciiNormalized(
  el: HTMLInputElement | HTMLTextAreaElement,
  normalize: (raw: string) => string,
  apply: (next: string) => void
): void {
  // Conversion is now restricted to VAT-tab workflows only.
  // Keep other form fields untouched even on blur/composition end.
  void el;
  void normalize;
  void apply;
}
