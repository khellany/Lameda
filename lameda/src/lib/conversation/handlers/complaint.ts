/**
 * Structured complaint and return handler.
 *
 * Flow:
 * 1. Customer hits "complaint" intent → shown a 4-option category menu
 * 2. They select: Wrong Item / Delivery Issue / Return Request / Other
 * 3. If order-related: ask for order reference
 * 4. Log complaint to messages table + escalate to human handoff
 */

import { sendButtonsMessage, sendTextMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { handleHumanHandoff } from './handoff'
import type { ConversationContext, HandlerResult } from '../types'

/** Entry point — shows category menu */
export async function handleComplaintStart(ctx: ConversationContext): Promise<HandlerResult> {
  const msg =
    `😔 I'm sorry to hear that. Let me help sort this out!\n\n` +
    `What's the issue?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'complaint_wrong_item',    title: '📦 Wrong Item Received' },
    { id: 'complaint_delivery',      title: '🚚 Delivery Problem' },
    { id: 'complaint_return',        title: '↩️ I Want to Return' },
    { id: 'complaint_other',         title: '💬 Something Else' },
  ])

  return {
    newState: { ...ctx.state, phase: 'complaint' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

/** Called when a complaint category button is tapped */
export async function handleComplaintCategory(
  ctx: ConversationContext,
  category: 'wrong_item' | 'delivery' | 'return' | 'other',
): Promise<HandlerResult> {
  const supabase = createAdminClient()

  // Log the complaint
  const complaintRef = `CMP-${Date.now().toString(36).toUpperCase()}`

  await supabase.from('messages').insert({
    conversation_id: ctx.conversationId,
    merchant_id: ctx.merchantId,
    customer_id: ctx.customerId,
    direction: 'inbound',
    content: `[COMPLAINT] Category: ${category} | Ref: ${complaintRef}`,
    message_type: 'text',
    external_message_id: null,
    metadata: { complaint_ref: complaintRef, complaint_category: category },
  })

  logger.info(
    { category, complaintRef, customerId: ctx.customerId, merchantId: ctx.merchantId },
    'Complaint logged',
  )

  const CATEGORY_MESSAGES: Record<string, string> = {
    wrong_item:
      `📦 Sorry about the wrong item!\n\n` +
      `Please share your *order reference* (e.g. LMD-XXXXX) and a photo of what you received. ` +
      `Our team will resolve this within 24 hours.\n\n` +
      `Your complaint reference: \`${complaintRef}\``,
    delivery:
      `🚚 Sorry about the delivery issue!\n\n` +
      `Please share your *order reference* so our team can investigate immediately.\n\n` +
      `Your complaint reference: \`${complaintRef}\``,
    return:
      `↩️ We can help with that!\n\n` +
      `Please share your *order reference* and reason for return. ` +
      `Returns are accepted within 7 days of delivery in original condition.\n\n` +
      `Your complaint reference: \`${complaintRef}\``,
    other:
      `💬 No problem — our team will look into it!\n\n` +
      `Please describe your issue in as much detail as possible.\n\n` +
      `Your complaint reference: \`${complaintRef}\``,
  }

  const replyMsg = CATEGORY_MESSAGES[category]
  await sendTextMessage(ctx.botToken, ctx.chatId, replyMsg)

  // Escalate to human handoff after logging
  return handleHumanHandoff(ctx, 'customer_request')
}
