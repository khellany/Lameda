import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
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
  const reply = await generateSupportReply(ctx.rawMessage, ctx.state.language)
  await sendButtonsMessage(ctx.botToken, ctx.chatId, reply, [
    { id: 'browse_all', title: '🛍 Back to Shopping' },
  ])
  return { newState: { ...ctx.state, phase: 'support' }, newCart: ctx.cart, replySent: reply }
}

/** Responds conversationally to social/acknowledgement phrases (thank you, okay, etc.) */
export async function handleSocialPhrase(ctx: ConversationContext): Promise<HandlerResult> {
  const lower = ctx.rawMessage.toLowerCase().trim()

  let reply: string
  if (/thank|thanks/i.test(lower)) {
    reply = `You're welcome! 😊 Let me know if there's anything else I can help you with.`
  } else if (/okay|ok|alright|noted|got it|received|understood/i.test(lower)) {
    reply = `Got it! 😊 What would you like to do next?`
  } else {
    reply = `Of course! 😊 Is there anything else I can help you with?`
  }

  await sendButtonsMessage(ctx.botToken, ctx.chatId, reply, [
    { id: 'browse_all', title: '🛍 Browse Products' },
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'order_status', title: '📦 My Orders' },
  ])

  return { newState: ctx.state, newCart: ctx.cart, replySent: reply }
}

/** Sends a friendly closing message when the customer signals they are done */
export async function handleSessionDone(ctx: ConversationContext): Promise<HandlerResult> {
  const reply = `Thank you for shopping with us! 🙏 Have a lovely day!\n\nCome back anytime — we're always here. 💛`
  await sendTextMessage(ctx.botToken, ctx.chatId, reply)
  return {
    newState: { ...ctx.state, phase: 'completed' },
    newCart: ctx.cart,
    replySent: reply,
  }
}
