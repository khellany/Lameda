'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { sendTextMessage } from '@/lib/telegram/client'

export interface ReplyState {
  success: boolean
  error?: string
  conversationId?: string
}

export interface ResolveState {
  success: boolean
  error?: string
}

// ─── Reply to a handoff conversation ──────────────────────────────────────────

export async function replyToHandoff(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return { success: false, error: 'Not authenticated.' }

  const conversationId = formData.get('conversationId') as string
  const replyText = (formData.get('reply') as string)?.trim()

  if (!conversationId || !replyText) {
    return { success: false, error: 'Reply cannot be empty.', conversationId }
  }

  const db = createAdminClient()

  // Fetch conversation + customer chat ID, scoped to merchant
  const { data: conv } = await db
    .from('conversations')
    .select('id, customer_id, customers!inner(phone_number), merchant_id')
    .eq('id', conversationId)
    .eq('merchant_id', ctx.merchant.id)
    .single()

  if (!conv) return { success: false, error: 'Conversation not found.', conversationId }

  const { data: merchant } = await db
    .from('merchants')
    .select('telegram_bot_token')
    .eq('id', ctx.merchant.id)
    .single()

  if (!merchant?.telegram_bot_token) {
    return { success: false, error: 'Bot token not configured.', conversationId }
  }

  const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token
  const customerChatId = (conv.customers as unknown as { phone_number: string })?.phone_number

  if (!customerChatId) {
    return { success: false, error: 'Could not resolve customer Telegram ID.', conversationId }
  }

  try {
    await sendTextMessage(botToken, customerChatId, replyText)
  } catch {
    return { success: false, error: 'Failed to send message via Telegram. Check your bot token.', conversationId }
  }

  await db.from('messages').insert({
    conversation_id: conversationId,
    merchant_id: ctx.merchant.id,
    customer_id: conv.customer_id,
    direction: 'outbound',
    content: replyText,
    message_type: 'text',
    external_message_id: null,
    metadata: { agent_reply: true, sent_from: 'dashboard' },
  })

  revalidatePath('/dashboard/handoffs')
  return { success: true, conversationId }
}

// ─── Mark handoff as resolved ─────────────────────────────────────────────────

export async function resolveHandoff(
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return { success: false, error: 'Not authenticated.' }

  const conversationId = formData.get('conversationId') as string
  if (!conversationId) return { success: false, error: 'Missing conversation ID.' }

  const db = createAdminClient()
  const { error } = await db
    .from('conversations')
    .update({ current_intent: null, status: 'active' })
    .eq('id', conversationId)
    .eq('merchant_id', ctx.merchant.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/handoffs')
  return { success: true }
}
