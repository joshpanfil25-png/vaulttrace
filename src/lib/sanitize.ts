/**
 * Strip null bytes and non-printable control characters, then trim.
 * Safe for use on any string field before passing to external APIs or storage.
 */
export function sanitizeString(s: unknown, maxLength = 1000): string {
  if (typeof s !== 'string') return ''
  return s
    .replace(/\0/g, '')                          // null bytes
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // non-printable controls (keep \t \n \r)
    .trim()
    .slice(0, maxLength)
}

/** Sanitize and enforce RFC 5321 max email length. */
export function sanitizeEmail(s: unknown): string {
  return sanitizeString(s, 254)
}

/** Sanitize employer name — strip control chars, limit to 200 chars. */
export function sanitizeEmployerName(s: unknown): string {
  return sanitizeString(s, 200)
}

/**
 * Sanitize a 4-digit year field — keep only digits, max 4 characters.
 * Returns empty string if no digits are present.
 */
export function sanitizeYear(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.replace(/[^\d]/g, '').slice(0, 4)
}

/**
 * Sanitize a free-form text blob (e.g. pasted LinkedIn text).
 * Strips null bytes and limits total length.
 */
export function sanitizeText(s: unknown, maxLength = 20_000): string {
  if (typeof s !== 'string') return ''
  return s.replace(/\0/g, '').slice(0, maxLength)
}
