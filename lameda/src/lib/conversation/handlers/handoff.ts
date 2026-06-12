/**
 * Human handoff handler (STORY-023).
 *
 * Triggered when:
 *   a) Customer explicitly asks for a human ("talk to someone", "speak to agent")
 *   b) AI confidence falls below the HANDOFF_THRESHOLD on any message
 *
 * What happens:
 *   1. Customer receives a warm "connecting you now" message
 *   2. Conversation status set to 'idle' + current_intent flagged as 'handoff:{reason}'
 *      (Sprint 7 dashboard will filter on current_intent to show handoff queue)
 *   3. Merchant admin is notified via Telegram to their admin_telegram_chat_id
 */

import { sendButtonsMessage, sendTextMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

export async function handleHumanHandoff(
  ctx: ConversationContext,
  reason: 'customer_request' | 'low_confidence' = 'customer_request',
): Promise<HandlerResult> {
  const supabase = createAdminClient()

  // Step 1: Mark conversation as handoff-pending in DB
  await supabase
    .from('conversations')
    .update({
      status: 'idle',
      current_intent: `handoff:${reason}`,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', ctx.conversationId)

  logger.info(
    { conversationId: ctx.conversationId, merchantId: ctx.merchantId, reason },
    'Human handoff triggered',
  )

  // Step 2: Notify merchant admin via Telegram
  const { data: merchant } = await supabase
    .from('merchants')
    .select('admin_telegram_chat_id, business_name')
    .eq('id', ctx.merchantId)
    .single()

  if (merchant?.admin_telegram_chat_id) {
    const reasonLabel =
      reason === 'low_confidence'
        ? 'AI confidence too low'
        : 'Customer requested human support'

    const adminAlert =
      `🚨 *Customer needs human support*\n\n` +
      `Reason: _${reasonLabel}_\n` +
      `Store: *${merchant.business_name ?? 'Your store'}*\n\n` +
      `Reply to this customer in your bot to take over the conversation.`

    await sendTextMessage(ctx.botToken, merchant.admin_telegram_chat_id, adminAlert).catch(err => {
      // Non-fatal: log but don't block the customer-facing response
      logger.warn({ err, merchantId: ctx.merchantId }, 'Failed to send handoff alert to merchant admin')
    })
  }

  // Step 3: Send customer-facing warm handoff message
  const msg =
    reason === 'low_confidence'
      ? `I want to make sure you get the best help here. 🙏\n\n` +
        `Let me connect you with our team — they'll be with you shortly!`
      : `No problem at all! 😊\n\n` +
        `I'm connecting you with one of our team members right now. ` +
        `They'll be with you shortly — usually within a few minutes.`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'browse_all', title: '🛍 Keep Browsing' },
  ])

  return {
    newState: { ...ctx.state, phase: 'support' },
    newCart: ctx.cart,
    replySent: msg,
  }
}
