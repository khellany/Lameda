import { sendButtonsMessage } from '@/lib/telegram/client'
import { generateSupportReply } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Fallback and support handlers.
 *
 * Fallback: unknown intent — gentle redirect back to main menu.
 * Support: customer has a complaint or question — AI-generated empathetic reply.
 */

export async function handleUnknown(ctx: ConversationContext): Promise<HandlerResult> {
  const msg =
    `I didn't quite get that 😊\n\n` +
    `Here's what I can help you with:`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'browse_all', title: '🛍 Browse Products' },
    { id: 'search_by_photo', title: '📸 Search by Photo' },
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'support', title: '💬 Get Help' },
  ])

  return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
}

export async function handleSupport(ctx: ConversationContext): Promise<HandlerResult> {
  const reply = await generateSupportReply(ctx.rawMessage)
  await sendButtonsMessage(ctx.botToken, ctx.chatId, reply, [
    { id: 'browse_all', title: '🛍 Back to Shopping' },
  ])
  return { newState: { ...ctx.state, phase: 'support' }, newCart: ctx.cart, replySent: reply }
}
