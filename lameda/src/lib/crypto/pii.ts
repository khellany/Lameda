/**
 * PII field-level encryption using AES-256-GCM.
 *
 * ALGORITHM CHOICE: AES-256-GCM
 * - 256-bit key: approved for SECRET and TOP SECRET by NSA Suite B
 * - GCM mode: authenticated encryption — provides both confidentiality
 *   AND integrity. An attacker cannot tamper with ciphertext without
 *   the auth tag check failing at decrypt time.
 * - Random 96-bit IV per encrypt call: GCM is deterministic given the
 *   same key + IV. Using randomBytes(12) per call ensures two encryptions
 *   of the same plaintext produce different ciphertext — critical for PII.
 *
 * STORED FORMAT (plaintext column, encrypted content):
 *   enc:v1:{iv_hex}:{auth_tag_hex}:{ciphertext_hex}
 *
 *   v1    — key version; enables key rotation without big-bang migration
 *   IV    — 12 bytes (96 bits), random per call
 *   tag   — 16 bytes (128 bits), GCM authentication tag
 *   data  — variable length
 *
 * EXAMPLE (email "amaka@example.com"):
 *   enc:v1:a3f1...24 chars....:b9c2...32 chars....:d4e5...N chars....
 *
 * KEY MANAGEMENT:
 *   PII_ENCRYPTION_KEY — 64-char hex string (32 bytes) in Vercel env vars.
 *   Never stored in DB. Never logged. Rotate quarterly.
 *   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * MIGRATION PERIOD:
 *   decryptPii() returns the value as-is if it does not start with "enc:v1:".
 *   This allows plaintext values that existed before encryption was enabled
 *   to be read without error. Re-encrypt them on next write.
 *
 * FIELDS ENCRYPTED (as of Sprint 5):
 *   merchants.email, merchants.owner_name, merchants.telegram_bot_token
 *   orders.delivery_address
 *   customers.display_name (when set)
 *
 * FIELDS NOT ENCRYPTED (intentional):
 *   customers.phone_number — Telegram chat IDs (upsert conflict key; not real phone numbers)
 *   merchants.api_key      — credential we must return verbatim on first creation
 *   products.*             — no PII
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm' as const
const KEY_BYTES  = 32   // 256 bits
const IV_BYTES   = 12   // 96 bits — NIST recommended for GCM
const TAG_BYTES  = 16   // 128 bits — GCM default, maximum security
const CURRENT_VERSION = 'v1'
const PREFIX = `enc:${CURRENT_VERSION}:`

// ─── Key resolution ───────────────────────────────────────────────────────────

/**
 * Version-keyed map so that during rotation, old ciphertext (enc:v1:...)
 * can still be decrypted using the v1 key while new writes use v2.
 *
 * To rotate:
 *   1. Generate new key, set PII_ENCRYPTION_KEY_V2 in env.
 *   2. Set PII_ENCRYPTION_KEY to v2 value (new writes use v2).
 *   3. Keep PII_ENCRYPTION_KEY_V1 in env until all v1 rows are re-encrypted.
 *   4. Run a background job: SELECT rows WHERE value LIKE 'enc:v1:%', re-encrypt to v2.
 *   5. Remove PII_ENCRYPTION_KEY_V1.
 */
function resolveKey(version: string): Buffer {
  const envVar = version === CURRENT_VERSION
    ? 'PII_ENCRYPTION_KEY'
    : `PII_ENCRYPTION_KEY_${version.toUpperCase()}`

  const keyHex = process.env[envVar]
  if (!keyHex) {
    throw new Error(`${envVar} is not set. Cannot ${version === CURRENT_VERSION ? 'encrypt' : 'decrypt'} PII.`)
  }
  if (keyHex.length !== KEY_BYTES * 2) {
    throw new Error(`${envVar} must be a ${KEY_BYTES * 2}-character hex string (${KEY_BYTES} bytes). Got ${keyHex.length} chars.`)
  }
  return Buffer.from(keyHex, 'hex')
}

// ─── Core encrypt / decrypt ───────────────────────────────────────────────────

/**
 * Encrypts a PII string value using AES-256-GCM.
 * Returns the stored format: enc:v1:{iv}:{tag}:{ciphertext}
 *
 * Calling encryptPii("") or encryptPii(null-ish) returns the value unchanged —
 * empty/null fields do not need encryption.
 */
export function encryptPii(plaintext: string): string {
  if (!plaintext) return plaintext

  const key = resolveKey(CURRENT_VERSION)
  const iv  = randomBytes(IV_BYTES)

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const tag = cipher.getAuthTag()

  return [
    PREFIX,
    iv.toString('hex'),
    ':',
    tag.toString('hex'),
    ':',
    encrypted.toString('hex'),
  ].join('')
}

/**
 * Decrypts a value encrypted by encryptPii().
 * If the value does not start with the enc: prefix, returns it unchanged
 * (graceful handling of plaintext values during migration period).
 *
 * Throws if the auth tag fails — this indicates ciphertext tampering or
 * wrong key, and the calling code should surface this as an error rather
 * than silently returning garbage data.
 */
export function decryptPii(stored: string): string {
  if (!stored || !stored.startsWith('enc:')) return stored

  // Extract version
  const afterEnc = stored.slice(4) // strip "enc:"
  const versionEnd = afterEnc.indexOf(':')
  if (versionEnd === -1) throw new Error('Invalid encrypted PII: missing version separator')

  const version = afterEnc.slice(0, versionEnd)
  const payload = afterEnc.slice(versionEnd + 1)

  const parts = payload.split(':')
  if (parts.length !== 3) {
    throw new Error(`Invalid encrypted PII format for version ${version}: expected 3 parts, got ${parts.length}`)
  }

  const [ivHex, tagHex, dataHex] = parts
  const key  = resolveKey(version)
  const iv   = Buffer.from(ivHex, 'hex')
  const tag  = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })
  decipher.setAuthTag(tag)

  try {
    return decipher.update(data, undefined, 'utf8') + decipher.final('utf8')
  } catch {
    // GCM auth tag failure — do not log the ciphertext itself
    throw new Error('PII decryption failed: auth tag mismatch — possible tampering or wrong key')
  }
}

/**
 * Returns true if the value was produced by encryptPii().
 * Use this to skip re-encryption of already-encrypted values (e.g. on UPDATE).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('enc:')
}

/**
 * Decrypts a field only if it is encrypted; returns as-is otherwise.
 * Convenience wrapper that removes the need for isEncrypted() + decryptPii() pairs.
 */
export function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null
  return isEncrypted(value) ? decryptPii(value) : value
}
