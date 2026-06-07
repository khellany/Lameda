import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies the HMAC-SHA512 signature on incoming Termii webhook requests.
 *
 * HOW IT WORKS:
 * Termii signs each webhook request with your webhook secret using
 * HMAC-SHA512. The signature is sent in the 'x-termii-signature' header
 * as a hex string. We recompute it from the raw request body and compare
 * using timingSafeEqual to prevent timing attacks.
 *
 * IMPORTANT: We must read the raw body bytes BEFORE any JSON parsing.
 * Parsing then re-serializing can alter whitespace and byte order,
 * invalidating the signature.
 *
 * TECHNICAL DEBT:
 * - Termii's signature header name and algorithm are hardcoded here.
 *   If the BSP changes, update SIGNATURE_HEADER and the algorithm
 *   in the createHmac call. The webhook route.ts file should not need
 *   to change - this function is the isolation layer.
 *
 * SECURITY NOTE:
 * - Always use timingSafeEqual, never === for signature comparison.
 *   String equality short-circuits on the first mismatch character,
 *   leaking timing information that enables forgery attacks.
 */

const SIGNATURE_HEADER = 'x-termii-signature'

export function verifyTermiiSignature(
  rawBody: Buffer,
  headers: Headers,
  secret: string
): boolean {
  const receivedSignature = headers.get(SIGNATURE_HEADER)

  if (!receivedSignature) {
    return false
  }

  const expectedSignature = createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex')

  try {
    return timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    // Buffer.from throws if the hex string has odd length (malformed header)
    return false
  }
}

/**
 * Verifies the HMAC-SHA512 signature on Paystack webhook requests.
 * Paystack uses the same algorithm but a different header name.
 */
export function verifyPaystackSignature(
  rawBody: Buffer,
  headers: Headers,
  secret: string
): boolean {
  const receivedSignature = headers.get('x-paystack-signature')

  if (!receivedSignature) {
    return false
  }

  const expectedSignature = createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex')

  try {
    return timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}
