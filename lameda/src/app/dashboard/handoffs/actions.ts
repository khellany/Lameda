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

  // Wrap everything — safeDecrypt throws when PII_ENCRYPTION_KEY is missing,
  // and any unhandled throw from a server action tears down the whole page in
  // Next.js App Router. We surface all errors as action state instead.
  try {
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
      return { success: false, error: 'Bot token not configured for this store.', conversationId }
    }

    // safeDecrypt throws if PII_ENCRYPTION_KEY env var is absent — caught below
    const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token
    const customerChatId = (conv.customers as unknown as { phone_number: string })?.phone_number

    if (!customerChatId) {
      return { success: false, error: 'Could not resolve customer Telegram ID.', conversationId }
    }

    await sendTextMessage(botToken, customerChatId, replyText)

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Surface PII key misconfiguration clearly so the operator knows what to fix
    const friendly = msg.includes('PII_ENCRYPTION_KEY')
      ? 'PII_ENCRYPTION_KEY is not set in this environment. Add it to your Vercel environment variables (Settings → Environment Variables) and redeploy.'
      : `Failed to send: ${msg}`
    return { success: false, error: friendly, conversationId }
  }
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
