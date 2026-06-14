import { createHmac, timingSafeEqual } from 'crypto'

export const PREVIEW_COOKIE = 'lameda_preview'
export const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function hmacSecret(): string {
  const secret = process.env.PREVIEW_HMAC_SECRET
  if (!secret) throw new Error('PREVIEW_HMAC_SECRET env var is not set')
  return secret
}

// Deterministic token derived from the secret — no email stored in the cookie.
// Rotate PREVIEW_HMAC_SECRET to instantly revoke all existing preview cookies.
export function generatePreviewToken(): string {
  return createHmac('sha256', hmacSecret())
    .update('lameda_preview_v1')
    .digest('hex')
}

// Constant-time comparison prevents timing-based guessing attacks.
export function verifyPreviewToken(value: string): boolean {
  try {
    const expected = generatePreviewToken()
    const a = Buffer.from(value.padEnd(expected.length, '\0'))
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
