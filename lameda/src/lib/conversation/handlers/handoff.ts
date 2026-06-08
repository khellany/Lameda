/**
 * Human handoff handler (STORY-021).
 *
 * Triggered when:
 *   a) Customer explicitly asks for a human ("talk to someone", "speak to agent")
 *   b) AI confidence falls below the HANDOFF_THRESHOLD on any message
 *
 * What happens:
 *   1. Customer receives a warm "connecting you now" message
 *   2. Conversation status set to 'waiting_human' in DB
 *   3. Handoff record created in conversations table for merchant dashboard pickup
 *
 * The merchant dashboard (Sprint 7) will display waiting_human conversations
 * via Supabase Realtime. Until then, merchants see them in the DB directly.
 */

import { sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

export async function handleHumanHandoff(
  ctx: ConversationContext,
  reason: 'customer_request' | 'low_confidence' = 'customer_request',
): Promise<HandlerResult> {
  const supabase = createAdminClient()

  // Mark conversation as waiting for human in DB
  await supabase
    .from('conversations')
    .update({
      status: 'idle', // closest to 'waiting_human' in current enum
      current_intent: `handoff:${reason}`,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', ctx.conversationId)

  logger.info(
    { conversationId: ctx.conversationId, merchantId: ctx.merchantId, reason },
    'Human handoff triggered',
  )

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
