/**
 * Verifies incoming Telegram webhook requests.
 *
 * HOW IT WORKS:
 * When registering a webhook via setWebhook(), you provide a secret_token
 * (up to 256 chars, alphanumeric + _ and -). Telegram includes this token
 * in every webhook request as the X-Telegram-Bot-Api-Secret-Token header.
 *
 * Verification is a constant-time string comparison against your stored secret.
 * Unlike WhatsApp/Paystack which use HMAC-SHA512, Telegram uses a simpler
 * shared-secret approach.
 *
 * Reference: https://core.telegram.org/bots/api#setwebhook
 *
 * MIGRATION NOTE (WhatsApp):
 * WhatsApp/Termii uses HMAC-SHA512 over the raw body (see lib/whatsapp/verify.ts).
 * When switching channels, swap this file - the webhook route does not change.
 */

import { timingSafeEqual } from 'crypto'

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token'

export function verifyTelegramWebhook(
  headers: Headers,
  secret: string
): boolean {
  const received = headers.get(TELEGRAM_SECRET_HEADER)

  if (!received) return false

  try {
    // timingSafeEqual prevents timing attacks even on a simple string comparison
    return timingSafeEqual(
      Buffer.from(received),
      Buffer.from(secret)
    )
  } catch {
    // Buffers of different lengths throw - means tokens don't match
    return false
  }
}
