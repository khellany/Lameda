import { logger } from '@/lib/utils/logger'

export interface SetWebhookResult {
  ok: boolean
  description?: string
}

/**
 * Registers a Telegram bot's webhook via the Bot API.
 *
 * Called once during merchant onboarding so the bot starts receiving
 * updates immediately. Also used to re-register if the app URL changes.
 *
 * Telegram requires the secret_token to match what the receiving endpoint
 * validates via X-Telegram-Bot-Api-Secret-Token — our webhook route uses
 * TELEGRAM_WEBHOOK_SECRET for this.
 */
export async function registerTelegramWebhook(
  botToken: string,
  merchantId: string,
  appUrl: string,
  webhookSecret: string,
): Promise<SetWebhookResult> {
  const webhookUrl = `${appUrl}/api/webhook/telegram/${merchantId}`

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: webhookSecret,
          allowed_updates: ['message', 'callback_query'],
        }),
      },
    )

    const data = (await response.json()) as { ok: boolean; description?: string }

    if (!data.ok) {
      logger.warn({ merchantId, description: data.description }, 'Telegram setWebhook returned ok=false')
    }

    return { ok: data.ok, description: data.description }
  } catch (err) {
    logger.error({ err, merchantId }, 'Telegram setWebhook network error')
    return { ok: false, description: String(err) }
  }
}

/**
 * Validates that a bot token has the expected format (digit:hash) and
 * can reach the Telegram API, before inserting into the database.
 */
export async function validateBotToken(botToken: string): Promise<{ valid: boolean; botName?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = (await response.json()) as { ok: boolean; result?: { username?: string; first_name?: string } }

    if (!data.ok) return { valid: false }

    return {
      valid: true,
      botName: data.result?.username ?? data.result?.first_name ?? 'your bot',
    }
  } catch {
    return { valid: false }
  }
}
