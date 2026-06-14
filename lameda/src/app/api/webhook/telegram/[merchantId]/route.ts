import { NextRequest, NextResponse } from 'next/server'
import { verifyTelegramWebhook } from '@/lib/telegram/verify'
import { TelegramUpdateSchema, normalizeTelegramUpdate } from '@/lib/telegram/types'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { runStateMachine } from '@/lib/conversation/stateMachine'
import { sendTextMessage } from '@/lib/telegram/client'
import { checkCustomerRateLimit } from '@/lib/utils/rateLimit'
import { getMerchantConfig, type BusinessType } from '@/lib/merchant/config'
import { safeDecrypt } from '@/lib/crypto/pii'
import type { ConversationState, Cart } from '@/lib/conversation/types'
import {
  handleRegisterAdmin,
  handleAdminHelp,
  handleListProducts,
  handleOrdersSummary,
  handleDispatchOrder,
  handleCancelOrderByRef,
  startAddProduct,
  startUpdateStock,
  continueAdminFlow,
} from '@/lib/conversation/handlers/admin'

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

  // Parse + validate payload with Zod (STORY-018)
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    logger.error({ merchantId }, 'Telegram webhook payload is not valid JSON')
    return NextResponse.json({ ok: true })
  }

  const parseResult = TelegramUpdateSchema.safeParse(rawBody)
  if (!parseResult.success) {
    logger.warn({ merchantId, issues: parseResult.error.issues }, 'Telegram payload failed schema validation')
    return NextResponse.json({ ok: true })
  }

  const update = parseResult.data

  const supabase = createAdminClient()
  const externalId = String(update.update_id)

  // Step 2: Idempotency check
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('external_id', externalId)
    .eq('source', 'telegram')
    .maybeSingle()

  if (existing) {
    logger.info({ externalId }, 'Duplicate Telegram update - skipping')
    return NextResponse.json({ ok: true })
  }

  // Log raw event
  const { data: webhookEvent } = await supabase
    .from('webhook_events')
    .insert({
      source: 'telegram', // enum value added in Migration 007
      event_type: update.callback_query ? 'callback_query' : 'message',
      external_id: externalId,
      status: 'received',
      payload: update as unknown as import('@/types/database').Json,
    })
    .select('id')
    .single()

  const webhookEventId = webhookEvent?.id

  try {
    // Step 3: Load merchant (includes business_type + merchant_config for Sprint 4)
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, bot_name, telegram_bot_token, subscription_tier, is_active, business_type, merchant_config, admin_telegram_chat_id')
      .eq('id', merchantId)
      .eq('is_active', true)
      .maybeSingle()

    if (!merchant?.telegram_bot_token) {
      logger.warn({ merchantId }, 'Merchant not found or no Telegram bot token configured')
      await markWebhookFailed(supabase, webhookEventId, 'Merchant not found')
      return NextResponse.json({ ok: true })
    }

    // Decrypt the bot token — stored as AES-256-GCM ciphertext (Sprint 5)
    // safeDecrypt() returns plaintext as-is for legacy unencrypted rows
    const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token

    // Resolve MerchantConfig from business_type + JSONB overrides (STORY-019)
    const merchantConfig = getMerchantConfig(
      (merchant.business_type as BusinessType) ?? 'general',
      (merchant.merchant_config as Partial<import('@/lib/merchant/config').MerchantConfig>) ?? undefined,
    )

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

    // Step 5b: Rate limit check (STORY-017 / TD-004)
    // Button callbacks are exempt — they don't trigger AI calls.
    if (!update.callback_query) {
      const { allowed, count } = await checkCustomerRateLimit(merchant.id, customer.id)
      if (!allowed) {
        logger.warn({ customerId: customer.id, merchantId, count }, 'Rate limit exceeded — dropping message')
        await sendTextMessage(
          botToken,
          message.from,
          `⏳ You're sending messages too quickly. Please wait a moment before sending another. 😊`,
        )
        await markWebhookProcessed(supabase, webhookEventId)
        return NextResponse.json({ ok: true })
      }
    }

    // Step 6: Load or create conversation with full state.
    // Include 'idle' so handoff conversations (status='idle') are resumed correctly
    // rather than creating a new active conversation that bypasses the handoff.
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, message_count, state, cart, status, current_intent')
      .eq('merchant_id', merchant.id)
      .eq('customer_id', customer.id)
      .in('status', ['active', 'idle'])
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let conversationId: string
    let messageCount: number
    let convState: ConversationState
    let convCart: Cart
    let convStatus: string
    let convCurrentIntent: string | null

    if (existingConv) {
      conversationId = existingConv.id
      messageCount = existingConv.message_count ?? 0
      convState = (existingConv.state as unknown as ConversationState) ?? { phase: 'greeting', channel: 'telegram' }
      convCart = (existingConv.cart as unknown as Cart) ?? { items: [], totalKobo: 0 }
      convStatus = existingConv.status
      convCurrentIntent = existingConv.current_intent
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          merchant_id: merchant.id,
          customer_id: customer.id,
          status: 'active',
          state: { phase: 'greeting', channel: 'telegram' },
          cart: { items: [], totalKobo: 0 },
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
      convState = { phase: 'greeting', channel: 'telegram' }
      convCart = { items: [], totalKobo: 0 }
      convStatus = 'active'
      convCurrentIntent = null
    }

    // A handoff is active when the conversation was paused for agent takeover.
    // While this is true the bot must NOT run the state machine — the agent owns the conversation.
    const isHandoffActive = convStatus === 'idle' && (convCurrentIntent?.startsWith('handoff:') ?? false)

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

    // Step 7: Admin command routing (pre-empts customer state machine)
    //
    // /register is available to anyone — it's the one-time admin setup command.
    // All other slash commands and admin flow continuations require the sender
    // to be the registered admin (admin_telegram_chat_id === message.from).
    const callbackQueryId = update.callback_query?.id ?? null
    const incomingText = message.text ?? ''
    const isSlashCommand = incomingText.startsWith('/')
    const isAdminSender = merchant.admin_telegram_chat_id === message.from

    // Handoff guard: the agent owns this conversation — bot stays silent for customer messages.
    // We still persist the message (done above) and acknowledge once so the customer knows
    // a human is on the way, but we never call runStateMachine while handoff is active.
    if (!isAdminSender && isHandoffActive) {
      const alreadyAcked = (convState as unknown as Record<string, unknown>).handoffAcknowledged === true
      if (!alreadyAcked) {
        await sendTextMessage(
          botToken,
          message.from,
          `⏳ You're connected with our support team. They'll get back to you shortly — usually within a few minutes. Thanks for your patience! 🙏`,
        )
        await supabase
          .from('conversations')
          .update({
            state: { ...(convState as object), handoffAcknowledged: true } as unknown as import('@/types/database').Json,
            message_count: messageCount + 1,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId)
      }
      await markWebhookProcessed(supabase, webhookEventId)
      return NextResponse.json({ ok: true })
    }

    // STORY-028: stamp funnel step 4 on the first inbound customer message.
    // Null-guarded so the write fires at most once per merchant; idempotent at DB level.
    if (!isAdminSender) {
      supabase
        .from('merchants')
        .update({ first_customer_message_at: new Date().toISOString() })
        .eq('id', merchantId)
        .is('first_customer_message_at', null)
        .then(
          ({ error }) => { if (!error) logger.info({ merchantId, event: 'funnel.first_customer_message' }, 'First customer message received') },
          () => null, // non-fatal: don't block the customer response
        )
    }

    let result = null as import('@/lib/conversation/types').HandlerResult | null

    if (isSlashCommand && incomingText.toLowerCase().startsWith('/register')) {
      // /register is the bootstrap — anyone in the bot can attempt it
      result = await handleRegisterAdmin(incomingText, message.from, botToken, merchant.id, convState, convCart)
    } else if (isAdminSender) {
      if (convState.phase === 'admin_flow' && convState.adminFlow && !isSlashCommand) {
        // Admin is mid-flow — continue the multi-step command
        result = await continueAdminFlow(incomingText, message.from, botToken, merchant.id, convState, convCart)
      } else if (isSlashCommand) {
        // Route slash command to the correct admin handler
        const [cmd, ...args] = incomingText.trim().split(/\s+/)
        switch (cmd.toLowerCase()) {
          case '/admin':
          case '/help':
            result = await handleAdminHelp(botToken, message.from, convState, convCart)
            break
          case '/listproducts':
            result = await handleListProducts(args, botToken, message.from, merchant.id, convState, convCart)
            break
          case '/addproduct':
            result = await startAddProduct(botToken, message.from, convState, convCart)
            break
          case '/updatestock':
            result = await startUpdateStock(botToken, message.from, convState, convCart)
            break
          case '/orders':
            result = await handleOrdersSummary(args, botToken, message.from, merchant.id, convState, convCart)
            break
          case '/dispatch':
            result = await handleDispatchOrder(args[0] ?? '', botToken, message.from, merchant.id, convState, convCart)
            break
          case '/cancelorder':
            result = await handleCancelOrderByRef(args[0] ?? '', botToken, message.from, merchant.id, convState, convCart)
            break
          case '/reply': {
            // /reply <shortcode> <message text>
            // shortcode = last 8 characters of conversation UUID
            // Lets the merchant agent reply to a customer from within Telegram itself.
            const shortcode = args[0] ?? ''
            const replyBody = args.slice(1).join(' ').trim()
            if (!shortcode || !replyBody) {
              await sendTextMessage(botToken, message.from, `Usage: /reply <conv-id> <message>\n\nExample: /reply a3b4c5d6 Your order is on the way!`)
              result = { newState: convState, newCart: convCart, replySent: 'Reply usage hint sent.' }
              break
            }
            // Find the conversation by shortcode suffix
            const { data: targetConv } = await supabase
              .from('conversations')
              .select('id, customer_id, customers!inner(phone_number)')
              .eq('merchant_id', merchant.id)
              .like('id', `%-${shortcode}`)
              .maybeSingle()
            if (!targetConv) {
              // Supabase UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx — last 12 chars before suffix
              // Fallback: search by last 8 chars of the UUID string without dashes
              const { data: fallbackConv } = await supabase
                .from('conversations')
                .select('id, customer_id, customers!inner(phone_number)')
                .eq('merchant_id', merchant.id)
                .in('status', ['active', 'idle'])
                .order('last_message_at', { ascending: false })
                .limit(20)
              const matched = fallbackConv?.find(c => c.id.replace(/-/g, '').endsWith(shortcode))
              if (!matched) {
                await sendTextMessage(botToken, message.from, `❌ No conversation found with shortcode "${shortcode}". Check your handoffs dashboard for the correct ID.`)
                result = { newState: convState, newCart: convCart, replySent: 'Conv not found.' }
                break
              }
              const customerChatId = (matched.customers as unknown as { phone_number: string })?.phone_number
              if (customerChatId) {
                await sendTextMessage(botToken, customerChatId, replyBody)
                await supabase.from('messages').insert({
                  conversation_id: matched.id, merchant_id: merchant.id, customer_id: matched.customer_id,
                  direction: 'outbound', content: replyBody, message_type: 'text',
                  external_message_id: null, metadata: { agent_relay: true, via: 'telegram_reply_cmd' },
                })
                await sendTextMessage(botToken, message.from, `✅ Sent to customer.`)
              }
              result = { newState: convState, newCart: convCart, replySent: '✅ Relayed.' }
              break
            }
            const customerChatId = (targetConv.customers as unknown as { phone_number: string })?.phone_number
            if (customerChatId) {
              await sendTextMessage(botToken, customerChatId, replyBody)
              await supabase.from('messages').insert({
                conversation_id: targetConv.id, merchant_id: merchant.id, customer_id: targetConv.customer_id,
                direction: 'outbound', content: replyBody, message_type: 'text',
                external_message_id: null, metadata: { agent_relay: true, via: 'telegram_reply_cmd' },
              })
              await sendTextMessage(botToken, message.from, `✅ Sent to customer.`)
            }
            result = { newState: convState, newCart: convCart, replySent: '✅ Relayed.' }
            break
          }
          default:
            result = await handleAdminHelp(botToken, message.from, convState, convCart)
        }
      } else {
        // Admin sent plain text (not a slash command, not mid-flow).
        // If there's exactly one open handoff, relay directly to that customer.
        const { data: openHandoffs } = await supabase
          .from('conversations')
          .select('id, customer_id, customers!inner(phone_number)')
          .eq('merchant_id', merchant.id)
          .eq('status', 'idle')
          .like('current_intent', 'handoff:%')
          .order('last_message_at', { ascending: false })
          .limit(10)
        if (openHandoffs && openHandoffs.length === 1 && incomingText.trim()) {
          const handoff = openHandoffs[0]
          const customerChatId = (handoff.customers as unknown as { phone_number: string })?.phone_number
          if (customerChatId) {
            await sendTextMessage(botToken, customerChatId, incomingText.trim())
            await supabase.from('messages').insert({
              conversation_id: handoff.id, merchant_id: merchant.id, customer_id: handoff.customer_id,
              direction: 'outbound', content: incomingText.trim(), message_type: 'text',
              external_message_id: null, metadata: { agent_relay: true, via: 'telegram_plain_text' },
            })
            await sendTextMessage(botToken, message.from, `✅ Sent to customer.`)
            result = { newState: convState, newCart: convCart, replySent: '✅ Relayed.' }
          }
        } else if (openHandoffs && openHandoffs.length > 1) {
          const list = openHandoffs
            .map(h => `• \`/reply ${h.id.replace(/-/g, '').slice(-8)} ...\``)
            .join('\n')
          await sendTextMessage(botToken, message.from,
            `Multiple open handoffs — use the reply command:\n${list}\n\nExample: /reply a3b4c5d6 Your order is on its way!`)
          result = { newState: convState, newCart: convCart, replySent: 'Multiple handoffs hint sent.' }
        }
        // If no open handoffs: fall through to state machine (normal admin conversation with bot)
      }
    }

    // Fall through to customer state machine if not handled by admin routing
    if (!result) {
      result = await runStateMachine(
        incomingText,
        message.buttonPayload,
        message.type === 'media' ? message.mediaUrl : null,
        convState,
        convCart,
        merchant.id,
        customer.id,
        conversationId,
        botToken,
        message.from,
        callbackQueryId,
        merchantConfig,
      )
    }

    // Step 8: Persist updated state and cart
    await supabase
      .from('conversations')
      .update({
        state: result.newState as unknown as import('@/types/database').Json,
        cart: result.newCart as unknown as import('@/types/database').Json,
        last_message_at: new Date().toISOString(),
        message_count: messageCount + 1,
      })
      .eq('id', conversationId)

    // Persist outbound message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      merchant_id: merchant.id,
      customer_id: customer.id,
      direction: 'outbound',
      content: result.replySent,
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
