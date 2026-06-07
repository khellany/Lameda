import { NextRequest, NextResponse } from 'next/server'
import { verifyTelegramWebhook } from '@/lib/telegram/verify'
import { normalizeTelegramUpdate, type TelegramUpdate } from '@/lib/telegram/types'
import { sendTextMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/webhook/telegram/[merchantId]
 *
 * Receives Telegram updates for a specific merchant's bot.
 * Each merchant registers their Telegram bot webhook pointing to this URL
 * with their merchantId in the path.
 *
 * PROCESSING PIPELINE:
 * 1. Verify X-Telegram-Bot-Api-Secret-Token header
 * 2. Deduplicate via webhook_events (Telegram may retry on non-200)
 * 3. Load merchant by merchantId path param
 * 4. Normalize Telegram Update to BSP-agnostic NormalizedMessage
 * 5. Upsert customer (Telegram chat ID maps to phone_number field)
 * 6. Load or create conversation
 * 7. Route to state machine (stubbed in Sprint 1)
 * 8. Persist messages and send reply
 *
 * ALWAYS return 200. Telegram retries on any non-200 response.
 *
 * TECHNICAL DEBT:
 * - State machine is a stub (TD-003). Sprint 2 replaces the echo response
 *   with full intent classification and AI responses.
 * - No rate limiting per user (TD-004). Add before public launch.
 * - Telegram bot token stored in merchants.telegram_bot_token.
 *   For multiple bots per merchant (future), extract to a separate table.
 */

interface RouteParams {
  params: Promise<{ merchantId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { merchantId } = await params
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error('TELEGRAM_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ ok: true })
  }

  // Step 1: Verify secret token
  if (!verifyTelegramWebhook(request.headers, webhookSecret)) {
    logger.warn({ merchantId }, 'Invalid Telegram webhook secret - rejected')
    return NextResponse.json({ ok: true }) // Return 200 anyway to avoid Telegram retry loop
  }

  let update: TelegramUpdate

  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    logger.error({ merchantId }, 'Telegram webhook payload is not valid JSON')
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()
  const externalId = String(update.update_id)

  // Step 2: Idempotency check
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('external_id', externalId)
    .eq('source', 'termii') // reusing 'termii' slot for now - Sprint 2 adds 'telegram' enum value
    .maybeSingle()

  if (existing) {
    logger.info({ externalId }, 'Duplicate Telegram update - skipping')
    return NextResponse.json({ ok: true })
  }

  // Log raw event
  const { data: webhookEvent } = await supabase
    .from('webhook_events')
    .insert({
      source: 'termii', // TECHNICAL DEBT: 'telegram' enum value added in Migration 003
      event_type: update.callback_query ? 'callback_query' : 'message',
      external_id: externalId,
      status: 'received',
      payload: update as unknown as import('@/types/database').Json,
    })
    .select('id')
    .single()

  const webhookEventId = webhookEvent?.id

  try {
    // Step 3: Load merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, bot_name, telegram_bot_token, subscription_tier, is_active')
      .eq('id', merchantId)
      .eq('is_active', true)
      .maybeSingle()

    if (!merchant?.telegram_bot_token) {
      logger.warn({ merchantId }, 'Merchant not found or no Telegram bot token configured')
      await markWebhookFailed(supabase, webhookEventId, 'Merchant not found')
      return NextResponse.json({ ok: true })
    }

    // Step 4: Normalize update
    const message = normalizeTelegramUpdate(update, merchant.bot_name)

    if (!message) {
      logger.info({ merchantId, updateId: externalId }, 'Unsupported update type - skipping')
      await markWebhookProcessed(supabase, webhookEventId)
      return NextResponse.json({ ok: true })
    }

    logger.info(
      { merchantId, type: message.type, updateId: externalId },
      'Processing Telegram message'
    )

    // Step 5: Upsert customer
    // Telegram chat ID stored in phone_number field (consistent with WhatsApp approach)
    const { data: customer } = await supabase
      .from('customers')
      .upsert(
        {
          merchant_id: merchant.id,
          phone_number: message.from, // Telegram chat ID
          whatsapp_name: null,
          opted_in: true,
          opted_in_at: new Date().toISOString(),
          language_preference: 'en',
          metadata: {},
        },
        { onConflict: 'merchant_id,phone_number' }
      )
      .select('id')
      .single()

    if (!customer) {
      logger.error({ merchantId }, 'Customer upsert failed')
      await markWebhookFailed(supabase, webhookEventId, 'Customer upsert failed')
      return NextResponse.json({ ok: true })
    }

    // Step 6: Load or create conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, message_count')
      .eq('merchant_id', merchant.id)
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .maybeSingle()

    let conversationId: string
    let messageCount: number

    if (existingConv) {
      conversationId = existingConv.id
      messageCount = existingConv.message_count ?? 0
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          merchant_id: merchant.id,
          customer_id: customer.id,
          status: 'active',
          state: { phase: 'greeting', channel: 'telegram' },
          cart: { items: [], total_kobo: 0 },
          last_message_at: new Date().toISOString(),
          message_count: 0,
        })
        .select('id')
        .single()

      if (convError || !newConv) {
        logger.error({ err: convError }, 'Conversation creation failed')
        await markWebhookFailed(supabase, webhookEventId, 'Conversation creation failed')
        return NextResponse.json({ ok: true })
      }

      conversationId = newConv.id
      messageCount = 0
    }

    // Persist inbound message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      merchant_id: merchant.id,
      customer_id: customer.id,
      direction: 'inbound',
      content: message.text ?? '[non-text message]',
      message_type: message.type === 'button_reply' ? 'button' : 'text',
      external_message_id: externalId,
      metadata: { buttonPayload: message.buttonPayload, mediaUrl: message.mediaUrl },
    })

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), message_count: messageCount + 1 })
      .eq('id', conversationId)

    // Step 7: State machine stub (Sprint 2 replaces this)
    // TODO: implement src/lib/conversation/stateMachine.ts
    const replyText = `👋 Hi! I got your message: *${message.text ?? '[media]'}*\n\nLameda bot is being set up. Full experience coming soon!`

    // Step 8: Send reply via Telegram
    await sendTextMessage(merchant.telegram_bot_token, message.from, replyText)

    // Persist outbound message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      merchant_id: merchant.id,
      customer_id: customer.id,
      direction: 'outbound',
      content: replyText,
      message_type: 'text',
      external_message_id: null,
      metadata: {},
    })

    await markWebhookProcessed(supabase, webhookEventId)

    logger.info({ conversationId, merchantId }, 'Telegram webhook processed successfully')
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err, webhookEventId, merchantId }, 'Unhandled error in Telegram webhook')
    await markWebhookFailed(supabase, webhookEventId, String(err))
    return NextResponse.json({ ok: true })
  }
}

async function markWebhookProcessed(
  supabase: ReturnType<typeof createAdminClient>,
  id: string | undefined
) {
  if (!id) return
  await supabase
    .from('webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('id', id)
}

async function markWebhookFailed(
  supabase: ReturnType<typeof createAdminClient>,
  id: string | undefined,
  errorMessage: string
) {
  if (!id) return
  await supabase
    .from('webhook_events')
    .update({ status: 'failed', error_message: errorMessage, processed_at: new Date().toISOString() })
    .eq('id', id)
}
