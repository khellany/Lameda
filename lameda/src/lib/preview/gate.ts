// Uses Web Crypto API (globalThis.crypto.subtle) — works in Edge Runtime,
// Node.js 18+, and all server environments. No Node.js-only imports.

export const PREVIEW_COOKIE = 'lameda_preview'
export const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const ENC = new TextEncoder()

async function importKey(): Promise<CryptoKey> {
  const secret = process.env.PREVIEW_HMAC_SECRET
  if (!secret) throw new Error('PREVIEW_HMAC_SECRET env var is not set')
  return globalThis.crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

// Deterministic token derived from the secret — no email stored in the cookie.
// Rotate PREVIEW_HMAC_SECRET to instantly revoke all existing preview cookies.
export async function generatePreviewToken(): Promise<string> {
  const key = await importKey()
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, ENC.encode('lameda_preview_v1'))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// XOR-based constant-time string comparison (no Buffer dependency).
export async function verifyPreviewToken(value: string): Promise<boolean> {
  try {
    const expected = await generatePreviewToken()
    if (value.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= value.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}
