import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Greeting handler — first contact and /start command.
 *
 * Sends a warm welcome with the main menu as quick-reply buttons.
 * These three buttons cover 80% of all customer intents.
 */
export async function handleGreeting(ctx: ConversationContext): Promise<HandlerResult> {
  const welcomeText =
    `👗 Welcome to our store! I'm here to help you find the perfect outfit.\n\n` +
    `What would you like to do?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, welcomeText, [
    { id: 'browse_all', title: '🛍 Browse Products' },
    { id: 'view_cart', title: '🛒 View My Cart' },
    { id: 'support', title: '💬 Get Help' },
  ])

  return {
    newState: { ...ctx.state, phase: 'browsing' },
    newCart: ctx.cart,
    replySent: welcomeText,
  }
}
