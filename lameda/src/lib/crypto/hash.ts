/**
 * Deterministic HMAC-SHA256 hashes for searchable encrypted fields.
 *
 * THE PROBLEM:
 *   AES-256-GCM uses a random IV per call, so encrypting "amaka@example.com"
 *   twice produces two different ciphertexts. You cannot do:
 *     SELECT * FROM merchants WHERE email = encryptPii('amaka@example.com')
 *   because the stored ciphertext won't match.
 *
 * THE SOLUTION:
 *   Store a deterministic HMAC-SHA256 hash alongside the encrypted value.
 *   The hash is always the same for the same input (given the same HMAC key),
 *   so you can search: WHERE email_hash = hashForSearch('amaka@example.com')
 *
 * SECURITY PROPERTIES:
 *   - HMAC-SHA256 is a one-way function — you cannot reverse it to get the email
 *   - The HMAC key (PII_SEARCH_KEY) is different from the encryption key —
 *     separate concerns: even if an attacker learns the search key, they cannot
 *     decrypt the ciphertext (that requires the encryption key)
 *   - Resistant to offline dictionary attacks — unlike plain SHA256, the attacker
 *     needs the secret HMAC key to pre-compute a rainbow table
 *   - Values are normalized before hashing (trim + lowercase) so
 *     "Amaka@Example.com " and "amaka@example.com" produce the same hash
 *
 * KEY:
 *   PII_SEARCH_KEY — 64-char hex string (32 bytes) in Vercel env vars.
 *   Must be different from PII_ENCRYPTION_KEY.
 *   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * USAGE:
 *   // On insert/update:
 *   merchants.email           = encryptPii(email)
 *   merchants.email_hash      = hashForSearch(email)
 *
 *   // On lookup:
 *   .eq('email_hash', hashForSearch(inputEmail))
 */

import { createHmac } from 'node:crypto'

function getSearchKey(): Buffer {
  const keyHex = process.env.PII_SEARCH_KEY
  if (!keyHex) throw new Error('PII_SEARCH_KEY is not set.')
  if (keyHex.length !== 64) throw new Error('PII_SEARCH_KEY must be a 64-character hex string.')
  return Buffer.from(keyHex, 'hex')
}

/**
 * Returns a deterministic HMAC-SHA256 hex digest of the normalized input.
 * Normalizes: trim whitespace + lowercase.
 */
export function hashForSearch(value: string): string {
  const normalized = value.trim().toLowerCase()
  return createHmac('sha256', getSearchKey())
    .update(normalized, 'utf8')
    .digest('hex')
}
