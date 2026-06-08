import { logger } from '@/lib/utils/logger'

export interface SetWebhookResult {
  ok: boolean
  description?: string
}

/**
 * Strips the bot token from a Telegram API URL so it can be safely logged.
 * "https://api.telegram.org/bot1234:SECRET/setWebhook" → "/setWebhook"
 * The token must never appear in any log line.
 */
function safeTelegramMethod(url: string): string {
  return url.replace(/^https:\/\/api\.telegram\.org\/bot[^/]+/, '')
}

/**
 * Builds the Telegram Bot API base URL.
 * Kept in one place so the token is never string-interpolated in logged code.
 */
function telegramUrl(botToken: string, method: string): string {
  return `https://api.telegram.org/bot${botToken}/${method}`
}

// ─── Webhook registration ─────────────────────────────────────────────────────

/**
 * Registers a Telegram bot's webhook via the Bot API.
 * Called during merchant onboarding and after token rotation.
 */
export async function registerTelegramWebhook(
  botToken: string,
  merchantId: string,
  appUrl: string,
  webhookSecret: string,
): Promise<SetWebhookResult> {
  const webhookUrl = `${appUrl}/api/webhook/telegram/${merchantId}`

  try {
    const response = await fetch(telegramUrl(botToken, 'setWebhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ['message', 'callback_query'],
      }),
    })

    const data = (await response.json()) as { ok: boolean; description?: string }

    if (!data.ok) {
      // Log method name only — never the token-containing URL
      logger.warn({ merchantId, method: 'setWebhook', description: data.description }, 'Telegram API returned ok=false')
    }

    return { ok: data.ok, description: data.description }
  } catch (err) {
    // Sanitize error message — fetch errors sometimes embed the full URL
    const safeErr = err instanceof Error
      ? err.message.replace(/bot[\w:]+\//g, 'bot[REDACTED]/')
      : 'unknown network error'
    logger.error({ merchantId, method: 'setWebhook', err: safeErr }, 'Telegram API network error')
    return { ok: false, description: 'Network error during webhook registration' }
  }
}

/**
 * Removes the webhook from a bot. Called before token rotation to cleanly
 * deregister the old token. Best-effort — failure does not block rotation.
 */
export async function deleteTelegramWebhook(
  botToken: string,
  merchantId: string,
): Promise<boolean> {
  try {
    const response = await fetch(telegramUrl(botToken, 'deleteWebhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }),
    })
    const data = (await response.json()) as { ok: boolean }
    logger.info({ merchantId, ok: data.ok }, 'Old webhook deleted before token rotation')
    return data.ok
  } catch (err) {
    const safeErr = err instanceof Error
      ? err.message.replace(/bot[\w:]+\//g, 'bot[REDACTED]/')
      : 'unknown'
    logger.warn({ merchantId, err: safeErr }, 'deleteWebhook failed — rotation will continue anyway')
    return false
  }
}

// ─── Token validation ─────────────────────────────────────────────────────────

/**
 * Calls getMe to confirm a bot token is valid before writing to DB.
 * Returns the bot username so it can be stored as bot_name.
 */
export async function validateBotToken(
  botToken: string,
): Promise<{ valid: boolean; botName?: string }> {
  try {
    const response = await fetch(telegramUrl(botToken, 'getMe'))
    const data = (await response.json()) as {
      ok: boolean
      result?: { username?: string; first_name?: string }
    }

    if (!data.ok) return { valid: false }

    return {
      valid: true,
      botName: data.result?.username ?? data.result?.first_name ?? 'your bot',
    }
  } catch {
    // Do not log the error — it may contain the token in the URL
    return { valid: false }
  }
}
