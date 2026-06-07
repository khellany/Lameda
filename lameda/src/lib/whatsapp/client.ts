import { logger } from '@/lib/utils/logger'

/**
 * Termii WhatsApp API client.
 *
 * Wraps the Termii REST API for sending WhatsApp messages.
 * All methods return a typed result with success/error shape
 * so callers don't need to handle raw HTTP errors.
 *
 * Reference: https://developers.termii.com/whatsapp
 *
 * TECHNICAL DEBT:
 * - No retry logic on transient failures (5xx, network timeouts).
 *   At MVP scale with a single merchant, manual retries via the
 *   dashboard are acceptable. At 50+ merchants, add exponential
 *   backoff retry here or move sends through a pg-boss queue job.
 *   See queue/jobs.ts for the queue integration point.
 * - Message send results are not persisted to the messages table
 *   in this client. The caller (webhook route or state machine)
 *   is responsible for persistence. This keeps the client stateless.
 */

const TERMII_BASE_URL = 'https://api.ng.termii.com/api'

interface SendTextMessageParams {
  to: string
  body: string
  merchantApiKey?: string
}

interface SendButtonsMessageParams {
  to: string
  body: string
  buttons: Array<{ id: string; title: string }>
}

interface SendListMessageParams {
  to: string
  header: string
  body: string
  buttonLabel: string
  sections: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
}

interface TermiiSendResult {
  success: boolean
  messageId?: string
  error?: string
}

function getApiKey(merchantApiKey?: string): string {
  return merchantApiKey ?? process.env.TERMII_API_KEY!
}

export async function sendTextMessage(
  params: SendTextMessageParams
): Promise<TermiiSendResult> {
  const { to, body, merchantApiKey } = params

  try {
    const response = await fetch(`${TERMII_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        from: process.env.TERMII_SENDER_ID,
        sms: body,
        type: 'plain',
        channel: 'whatsapp',
        api_key: getApiKey(merchantApiKey),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ to, status: response.status, error: errorText }, 'Termii send failed')
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.message_id }
  } catch (err) {
    logger.error({ err, to }, 'Termii client network error')
    return { success: false, error: 'Network error' }
  }
}

export async function sendButtonsMessage(
  params: SendButtonsMessageParams
): Promise<TermiiSendResult> {
  const { to, body, buttons } = params

  try {
    const response = await fetch(`${TERMII_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        from: process.env.TERMII_SENDER_ID,
        type: 'plain',
        channel: 'whatsapp',
        api_key: getApiKey(),
        media: {
          url: null,
          caption: body,
        },
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ to, status: response.status }, 'Termii buttons send failed')
      return { success: false, error: errorText }
    }

    const data = await response.json()
    return { success: true, messageId: data.message_id }
  } catch (err) {
    logger.error({ err, to }, 'Termii client error sending buttons')
    return { success: false, error: 'Network error' }
  }
}

export async function sendListMessage(
  params: SendListMessageParams
): Promise<TermiiSendResult> {
  const { to, header, body, buttonLabel, sections } = params

  try {
    const response = await fetch(`${TERMII_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        from: process.env.TERMII_SENDER_ID,
        type: 'plain',
        channel: 'whatsapp',
        api_key: getApiKey(),
        list_message: {
          header,
          body,
          footer: 'Powered by Lameda',
          button: buttonLabel,
          sections,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ to, status: response.status }, 'Termii list send failed')
      return { success: false, error: errorText }
    }

    const data = await response.json()
    return { success: true, messageId: data.message_id }
  } catch (err) {
    logger.error({ err, to }, 'Termii client error sending list')
    return { success: false, error: 'Network error' }
  }
}
