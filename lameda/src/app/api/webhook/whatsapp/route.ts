import { NextRequest, NextResponse } from 'next/server'
import { verifyTermiiSignature } from '@/lib/whatsapp/verify'
import { normalizeTermiiPayload, type TermiiWebhookPayload } from '@/lib/whatsapp/types'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/webhook/whatsapp
 *
 * The single inbound entry point for all WhatsApp messages via Termii.
 * Every customer message to every merchant arrives here first.
 *
 * PROCESSING PIPELINE:
 * 1. Verify HMAC-SHA512 signature (reject all unsigned requests)
 * 2. Deduplicate via webhook_events table (idempotency - Termii may retry)
 * 3. Normalize the raw Termii payload to a BSP-agnostic message
 * 4. Identify which merchant the message belongs to (by destination number)
 * 5. Upsert the customer record
 * 6. Load or create the conversation + state
 * 7. Route to the conversation state machine (TODO: Sprint 2)
 * 8. Persist outbound response
 *
 * RESPONSE:
 * Always return 200 immediately after deduplication check.
 * Termii retries on non-200. Long processing must be async.
 *
 * TECHNICAL DEBT:
 * - Steps 6-8 (state machine routing) are stubbed with a simple echo
 *   response for Sprint 1. The full state machine is implemented in
 *   Sprint 2 (src/lib/conversation/stateMachine.ts).
 * - Merchant lookup is by WhatsApp number (to field). This assumes a
 *   1:1 merchant-to-number mapping. If we ever support multiple numbers
 *   per merchant, add a whatsapp_numbers join table.
 * - No rate limiting per customer. A single customer sending 100 messages
 *   in 1 second will trigger 100 AI calls. Add Redis-based rate limiting
 *   at Sprint 3 before public launch.
 *
 * SECURITY:
 * - Signature verification is the first check. Unsigned requests never
 *   touch the database.
 * - rawBody is read once and reused. Never re-read from request after
 *   the first read - the stream is consumed.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TERMII_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error('TERMII_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // Read raw body bytes before any parsing - signature verification
  // must happen on the exact bytes that were signed.
  const rawBody = Buffer.from(await request.arrayBuffer())

  // Step 1: Verify signature
  const isValid = verifyTermiiSignature(rawBody, request.headers, webhookSecret)

  if (!isValid) {
    logger.warn({ ip: request.headers.get('x-forwarded-for') }, 'Invalid webhook signature - rejected')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: TermiiWebhookPayload

  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as TermiiWebhookPayload
  } catch {
    logger.error('Webhook payload is not valid JSON')
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const externalId = payload.data?.id

  // Step 2: Idempotency check - have we seen this message before?
  // Termii retries webhooks on non-200, so we must deduplicate.
  if (externalId) {
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id, status')
      .eq('external_id', externalId)
      .eq('source', 'termii')
      .maybeSingle()

    if (existing) {
      logger.info({ externalId }, 'Duplicate webhook - already processed')
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  // Log the raw event for debugging and audit trail
  const { data: webhookEvent, error: insertError } = await supabase
    .from('webhook_events')
    .insert({
      source: 'termii',
      event_type: payload.event,
      external_id: externalId ?? null,
      status: 'received',
      payload: payload as unknown as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (insertError) {
    logger.error({ err: insertError }, 'Failed to persist webhook event')
    // Do not return 500 - Termii would retry and we'd loop. Log and continue.
  }

  const webhookEventId = webhookEvent?.id

  try {
    // Step 3: Normalize to BSP-agnostic message format
    const message = normalizeTermiiPayload(payload)

    logger.info(
      { externalId: message.externalId, type: message.type, from: '[REDACTED]' },
      'Processing inbound message'
    )

    // Step 4: Identify merchant by destination WhatsApp number
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, bot_name, subscription_tier, is_active')
      .eq('whatsapp_number', message.to)
      .eq('is_active', true)
      .maybeSingle()

    if (merchantError || !merchant) {
      logger.warn({ to: message.to }, 'No active merchant found for destination number')
      await markWebhookFailed(supabase, webhookEventId, 'No merchant found')
      return NextResponse.json({ received: true })
    }

    // Step 5: Upsert customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert(
        {
          merchant_id: merchant.id,
          phone_number: message.from,
          whatsapp_name: null,
          opted_in: true,
          opted_in_at: new Date().toISOString(),
          language_preference: 'en',
          metadata: {},
        },
        {
          onConflict: 'merchant_id,phone_number',
          ignoreDuplicates: false,
        }
      )
      .select('id, opted_in')
      .single()

    if (customerError || !customer) {
      logger.error({ err: customerError }, 'Customer upsert failed')
      await markWebhookFailed(supabase, webhookEventId, 'Customer upsert failed')
      return NextResponse.json({ received: true })
    }

    // Step 6: Load or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, status, state, cart, current_intent')
      .eq('merchant_id', merchant.id)
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          merchant_id: merchant.id,
          customer_id: customer.id,
          status: 'active',
          state: { phase: 'greeting' },
          current_intent: null,
          cart: { items: [], total_kobo: 0 },
          last_message_at: new Date().toISOString(),
          message_count: 0,
        })
        .select('id, status, state, cart, current_intent')
        .single()

      if (convError || !newConv) {
        logger.error({ err: convError }, 'Conversation creation failed')
        await markWebhookFailed(supabase, webhookEventId, 'Conversation creation failed')
        return NextResponse.json({ received: true })
      }

      conversation = newConv
    }

    // Persist the inbound message to message history
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      merchant_id: merchant.id,
      customer_id: customer.id,
      direction: 'inbound',
      content: message.text ?? '[non-text message]',
      message_type: message.type === 'text' ? 'text'
        : message.type === 'button_reply' ? 'button'
        : message.type === 'list_reply' ? 'list'
        : 'text',
      external_message_id: message.externalId,
      metadata: { mediaUrl: message.mediaUrl, buttonPayload: message.buttonPayload },
    })

    // Update conversation activity timestamp
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count ?? 0) + 1,
      })
      .eq('id', conversation.id)

    // Step 7: Route to state machine
    // TODO (Sprint 2): Replace this stub with the full state machine.
    // The state machine will handle intent classification, AI responses,
    // cart management, and payment link generation.
    // File: src/lib/conversation/stateMachine.ts
    const responseText = `Hi! I received your message: "${message.text ?? '[media]'}". Lameda is setting up your experience.`

    // Step 8: Persist outbound message (the response we're about to send)
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      merchant_id: merchant.id,
      customer_id: customer.id,
      direction: 'outbound',
      content: responseText,
      message_type: 'text',
      external_message_id: null,
      metadata: {},
    })

    // Mark webhook as processed
    if (webhookEventId) {
      await supabase
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', webhookEventId)
    }

    logger.info(
      { conversationId: conversation.id, merchantId: merchant.id },
      'Webhook processed successfully'
    )

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error({ err, webhookEventId }, 'Unhandled error in webhook processing')
    await markWebhookFailed(supabase, webhookEventId, String(err))
    // Still return 200 - we logged the event. Returning 500 causes Termii
    // to retry which would re-process and potentially double-respond.
    return NextResponse.json({ received: true })
  }
}

/**
 * Marks a webhook_event row as failed with an error message.
 * Helper to avoid try/catch boilerplate in the main flow.
 */
async function markWebhookFailed(
  supabase: ReturnType<typeof createAdminClient>,
  webhookEventId: string | undefined,
  errorMessage: string
): Promise<void> {
  if (!webhookEventId) return

  await supabase
    .from('webhook_events')
    .update({
      status: 'failed',
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq('id', webhookEventId)
}
