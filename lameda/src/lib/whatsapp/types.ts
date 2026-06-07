/**
 * WhatsApp message type definitions for the Termii BSP webhook payload.
 *
 * Termii forwards WhatsApp Business API events to our webhook endpoint.
 * These types model the inbound payload structure.
 *
 * Reference: https://developers.termii.com/whatsapp
 *
 * TECHNICAL DEBT:
 * - These types were written against Termii's documented schema in May 2026.
 *   Termii may change their payload format without a major version bump.
 *   If messages stop parsing, compare incoming payload against these types.
 * - If we switch BSP (e.g., to 360Dialog or direct Meta API), this file
 *   will need to be rewritten. The rest of the codebase should depend on
 *   the NormalizedMessage type below, not on TermiiWebhookPayload directly.
 *   The normalize() function is the isolation boundary.
 */

// Raw payload Termii sends to our webhook
export interface TermiiWebhookPayload {
  event: string
  data: {
    id: string
    from: string
    to: string
    channel: 'whatsapp'
    api_key: string
    created_at: string
    text?: {
      body: string
    }
    media?: {
      url: string
      caption?: string
      mime_type: string
    }
    button_reply?: {
      id: string
      title: string
    }
    list_reply?: {
      id: string
      title: string
      description?: string
    }
  }
}

// Internal normalized message - BSP-agnostic
// All application code beyond the webhook handler should use this type.
export interface NormalizedMessage {
  externalId: string
  from: string
  to: string
  receivedAt: Date
  type: 'text' | 'media' | 'button_reply' | 'list_reply' | 'unknown'
  text: string | null
  mediaUrl: string | null
  buttonPayload: string | null
}

/**
 * Normalizes a raw Termii webhook payload into a BSP-agnostic message.
 * This is the single place that knows about Termii's format.
 */
export function normalizeTermiiPayload(payload: TermiiWebhookPayload): NormalizedMessage {
  const { data } = payload

  let type: NormalizedMessage['type'] = 'unknown'
  let text: string | null = null
  let mediaUrl: string | null = null
  let buttonPayload: string | null = null

  if (data.text?.body) {
    type = 'text'
    text = data.text.body.trim()
  } else if (data.media?.url) {
    type = 'media'
    mediaUrl = data.media.url
    text = data.media.caption ?? null
  } else if (data.button_reply) {
    type = 'button_reply'
    buttonPayload = data.button_reply.id
    text = data.button_reply.title
  } else if (data.list_reply) {
    type = 'list_reply'
    buttonPayload = data.list_reply.id
    text = data.list_reply.title
  }

  return {
    externalId: data.id,
    from: data.from,
    to: data.to,
    receivedAt: new Date(data.created_at),
    type,
    text,
    mediaUrl,
    buttonPayload,
  }
}
