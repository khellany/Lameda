/**
 * Telegram Bot API client.
 *
 * Wraps the Telegram Bot API for sending messages, buttons, and lists.
 * Mirrors the interface of lib/whatsapp/client.ts so the state machine
 * (Sprint 2) can call either without knowing which channel is active.
 *
 * Reference: https://core.telegram.org/bots/api
 *
 * TECHNICAL DEBT:
 * - No retry logic on transient failures. Same as Termii client (TD-002).
 *   Add exponential backoff at Sprint 3 before public launch.
 * - sendListMessage uses a simple numbered text list because Telegram
 *   does not have a native "list message" type like WhatsApp.
 *   The inline keyboard approximation is good enough for MVP.
 *
 * MIGRATION NOTE (WhatsApp):
 * When switching to WhatsApp, replace this file with lib/whatsapp/client.ts.
 * The state machine imports from a channel-agnostic wrapper (Sprint 2),
 * not directly from this file.
 */

import { logger } from '@/lib/utils/logger'

const TELEGRAM_API_BASE = 'https://api.telegram.org'

interface SendResult {
  success: boolean
  messageId?: number
  error?: string
}

/**
 * Sends a plain text message to a Telegram chat.
 */
export async function sendTextMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<SendResult> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      logger.error({ chatId, error: data.description }, 'Telegram sendMessage failed')
      return { success: false, error: data.description }
    }

    return { success: true, messageId: data.result.message_id }
  } catch (err) {
    logger.error({ err, chatId }, 'Telegram client network error')
    return { success: false, error: 'Network error' }
  }
}

/**
 * Sends a message with inline keyboard buttons.
 * Equivalent to WhatsApp quick reply buttons (max 3 per row recommended).
 */
export async function sendButtonsMessage(
  botToken: string,
  chatId: string,
  text: string,
  buttons: Array<{ id: string; title: string }>
): Promise<SendResult> {
  // Telegram inline keyboard: array of rows, each row is an array of buttons
  const inlineKeyboard = buttons.map((b) => [
    { text: b.title, callback_data: b.id },
  ])

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard },
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      logger.error({ chatId, error: data.description }, 'Telegram sendButtons failed')
      return { success: false, error: data.description }
    }

    return { success: true, messageId: data.result.message_id }
  } catch (err) {
    logger.error({ err, chatId }, 'Telegram buttons error')
    return { success: false, error: 'Network error' }
  }
}

/**
 * Sends a photo with an optional caption and inline keyboard buttons.
 * Falls back to a text message with the image URL if sendPhoto fails
 * (e.g. invalid URL or unsupported format).
 */
export async function sendPhotoMessage(
  botToken: string,
  chatId: string,
  photoUrl: string,
  caption: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<SendResult> {
  const inlineKeyboard = buttons.map(b => [{ text: b.title, callback_data: b.id }])

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard },
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      logger.warn({ chatId, error: data.description }, 'sendPhoto failed — falling back to text')
      // Fall back to text message with URL
      return sendButtonsMessage(botToken, chatId, caption, buttons)
    }

    return { success: true, messageId: data.result.message_id }
  } catch (err) {
    logger.error({ err, chatId }, 'sendPhoto network error')
    return sendButtonsMessage(botToken, chatId, caption, buttons)
  }
}

/**
 * Sends a numbered list as inline keyboard buttons.
 * Telegram has no native "list message" - inline keyboard is the closest equivalent.
 */
export async function sendListMessage(
  botToken: string,
  chatId: string,
  header: string,
  items: Array<{ id: string; title: string; description?: string }>
): Promise<SendResult> {
  const inlineKeyboard = items.map((item) => [
    {
      text: item.description ? `${item.title} — ${item.description}` : item.title,
      callback_data: item.id,
    },
  ])

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `*${header}*`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard },
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      logger.error({ chatId, error: data.description }, 'Telegram sendList failed')
      return { success: false, error: data.description }
    }

    return { success: true, messageId: data.result.message_id }
  } catch (err) {
    logger.error({ err, chatId }, 'Telegram list error')
    return { success: false, error: 'Network error' }
  }
}

/**
 * Resolves a Telegram file_id into a public download URL.
 *
 * Telegram stores media as opaque file_ids. To download the actual bytes
 * you first call getFile which returns a file_path, then build the URL:
 *   https://api.telegram.org/file/bot{token}/{file_path}
 *
 * The bot token appears in this URL — never expose it client-side.
 */
export async function resolveTelegramFileUrl(
  botToken: string,
  fileId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getFile?file_id=${fileId}`)
    const data = await res.json()

    if (!data.ok || !data.result?.file_path) {
      logger.error({ fileId, error: data.description }, 'Telegram getFile failed')
      return null
    }

    return `${TELEGRAM_API_BASE}/file/bot${botToken}/${data.result.file_path}`
  } catch (err) {
    logger.error({ err, fileId }, 'Telegram getFile network error')
    return null
  }
}

/**
 * Registers a webhook URL with Telegram for a given bot.
 * Call this once after deployment or whenever the URL changes.
 *
 * Usage:
 *   await registerWebhook(token, 'https://your-app.vercel.app/api/webhook/telegram/MERCHANT_ID', 'your-secret')
 */
export async function registerWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      return { success: false, error: data.description }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
