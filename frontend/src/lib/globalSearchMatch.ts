/** Strip non-digits for phone / VIN-style numeric matching. */
export function digitsOnly(s: string | undefined | null): string {
  if (!s) return ''
  return s.replace(/\D/g, '')
}

/** Minimum input to show global search: 2+ text chars or 3+ digits (e.g. phone fragment). */
export function searchQueryMeetsMinimum(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false
  const d = digitsOnly(t)
  return t.length >= 2 || d.length >= 3
}

/**
 * Match user query against text fields (substring, case-insensitive) and/or digit fields
 * (normalized digits substring, min 3 digits in query).
 */
export function combinedMatch(
  raw: string,
  textFields: (string | undefined | null)[],
  digitFields: (string | undefined | null)[]
): boolean {
  const t = raw.trim()
  if (!t) return false
  const ql = t.toLowerCase()
  const qd = digitsOnly(t)

  const textOk =
    ql.length >= 2 &&
    textFields.some((f) => {
      const v = f?.trim()
      return !!v && v.toLowerCase().includes(ql)
    })

  const digitOk =
    qd.length >= 3 &&
    digitFields.some((f) => {
      const fd = digitsOnly(f)
      return fd.length > 0 && fd.includes(qd)
    })

  return textOk || digitOk
}
