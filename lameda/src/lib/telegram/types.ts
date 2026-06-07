/**
 * Telegram Bot API type definitions and message normalizer.
 *
 * Telegram sends an "Update" object to our webhook on every message.
 * We normalize it into the same NormalizedMessage shape used throughout
 * the app, keeping all downstream code (state machine, DB persistence)
 * completely unaware of which channel the message came from.
 *
 * Reference: https://core.telegram.org/bots/api#update
 *
 * MIGRATION NOTE (WhatsApp):
 * When switching to WhatsApp, only this file and client.ts need to change.
 * The NormalizedMessage type and everything that consumes it stays the same.
 */

// Subset of the Telegram Update object we care about
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  caption?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
}

export interface TelegramPhotoSize {
  file_id: string
  width: number
  height: number
}

export interface TelegramDocument {
  file_id: string
  file_name?: string
  mime_type?: string
}

// ----------------------------------------------------------------
// BSP-agnostic normalized message - same shape as WhatsApp normalizer
// All application code beyond the webhook handler uses this type.
// ----------------------------------------------------------------
export interface NormalizedMessage {
  externalId: string
  from: string          // Telegram chat ID as string (equivalent to phone number)
  to: string            // Bot username (equivalent to merchant WhatsApp number)
  receivedAt: Date
  type: 'text' | 'media' | 'button_reply' | 'unknown'
  text: string | null
  mediaUrl: string | null
  buttonPayload: string | null
}

/**
 * Normalizes a Telegram Update into a BSP-agnostic NormalizedMessage.
 * Returns null if the update type is not supported (e.g. channel posts).
 */
export function normalizeTelegramUpdate(
  update: TelegramUpdate,
  botUsername: string
): NormalizedMessage | null {
  // Handle inline button press (callback_query)
  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message?.chat.id ?? cq.from.id

    return {
      externalId: String(update.update_id),
      from: String(chatId),
      to: botUsername,
      receivedAt: new Date(),
      type: 'button_reply',
      text: cq.data ?? null,
      mediaUrl: null,
      buttonPayload: cq.data ?? null,
    }
  }

  // Handle regular message
  if (update.message) {
    const msg = update.message

    // Only handle private chats for now
    if (msg.chat.type !== 'private') return null

    let type: NormalizedMessage['type'] = 'unknown'
    let text: string | null = null
    let mediaUrl: string | null = null

    if (msg.text) {
      type = 'text'
      text = msg.text.trim()
    } else if (msg.photo || msg.document) {
      type = 'media'
      text = msg.caption ?? null
      // Telegram photos need a getFile API call to resolve to a URL.
      // Storing file_id for now - resolve in Sprint 2 if needed.
      mediaUrl = msg.photo
        ? msg.photo[msg.photo.length - 1].file_id
        : (msg.document?.file_id ?? null)
    }

    return {
      externalId: String(update.update_id),
      from: String(msg.chat.id),
      to: botUsername,
      receivedAt: new Date(msg.date * 1000),
      type,
      text,
      mediaUrl,
      buttonPayload: null,
    }
  }

  return null
}
