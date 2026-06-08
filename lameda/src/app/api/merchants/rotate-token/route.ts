/**
 * POST /api/merchants/rotate-token
 *
 * Allows a business owner to replace their Telegram bot token after:
 *   - Suspected compromise
 *   - Routine security rotation
 *   - Accidental exposure in logs or support chats
 *
 * FLOW:
 *   1. Authenticate via X-Merchant-Api-Key
 *   2. Validate the new token against Telegram's getMe API
 *   3. Delete the old webhook (best-effort — failure does not block rotation)
 *   4. Encrypt the new token and store it
 *   5. Register the new webhook with Telegram
 *   6. Write audit log entry
 *
 * The old token is replaced atomically — there is no window where both
 * tokens are active. Telegram invalidates the old token the moment
 * /mybots → Revoke is clicked in BotFather, which should happen BEFORE
 * calling this endpoint.
 *
 * Auth: X-Merchant-Api-Key header
 * Body: { new_bot_token: string }
 *
 * Business owner steps:
 *   1. Open @BotFather → /mybots → select bot → API Token → Revoke current token
 *   2. Copy the new token from BotFather
 *   3. POST to this endpoint with the new token
 *   4. Confirm the bot responds normally
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveMerchantFromApiKey, getCallerIp } from '@/lib/crm/auth'
import { validateBotToken, deleteTelegramWebhook, registerTelegramWebhook } from '@/lib/telegram/webhook'
import { encryptPii } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

const RotateSchema = z.object({
  new_bot_token: z.string().min(10),
})

export async function POST(request: NextRequest) {
  const merchant = await resolveMerchantFromApiKey(request)
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RotateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'new_bot_token is required' }, { status: 422 })
  }

  const { new_bot_token } = parsed.data
  const supabase = createAdminClient()
  const callerIp = getCallerIp(request)

  // Step 1: Validate the new token is a real, working bot
  const { valid, botName } = await validateBotToken(new_bot_token)
  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid bot token. Verify it in @BotFather before rotating.' },
      { status: 422 },
    )
  }

  // Step 2: Fetch the current (old) token to cleanly delete its webhook
  // Minimal select — only the credential we need for cleanup
  const { data: current } = await supabase
    .from('merchants')
    .select('telegram_bot_token')
    .eq('id', merchant.id)
    .single()

  // Step 3: Delete old webhook (best-effort — old token may already be revoked)
  if (current?.telegram_bot_token) {
    const { safeDecrypt } = await import('@/lib/crypto/pii')
    const oldToken = safeDecrypt(current.telegram_bot_token)
    if (oldToken) {
      await deleteTelegramWebhook(oldToken, merchant.id)
    }
  }

  // Step 4: Encrypt new token and persist
  const encryptedNewToken = encryptPii(new_bot_token)

  const { error: updateError } = await supabase
    .from('merchants')
    .update({
      telegram_bot_token: encryptedNewToken,
      bot_name: botName ?? undefined,
    })
    .eq('id', merchant.id)

  if (updateError) {
    logger.error({ merchantId: merchant.id, err: updateError.message }, 'Token rotation DB update failed')
    return NextResponse.json({ error: 'Rotation failed. Please try again.' }, { status: 500 })
  }

  // Step 5: Register new webhook with Telegram
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
  const webhookResult = await registerTelegramWebhook(new_bot_token, merchant.id, appUrl, webhookSecret)

  // Step 6: Audit log
  await supabase.from('audit_logs').insert({
    merchant_id:   merchant.id,
    actor_type:    'merchant',
    action:        'bot_token_rotated',
    resource_type: 'merchant',
    resource_id:   merchant.id,
    metadata: {
      ip:                callerIp,
      webhook_registered: webhookResult.ok,
      business:          merchant.business_name,
    },
    ip_address: callerIp,
  })

  logger.info({ merchantId: merchant.id, webhookOk: webhookResult.ok }, 'Bot token rotated successfully')

  return NextResponse.json({
    success:            true,
    webhook_registered: webhookResult.ok,
    webhook_error:      webhookResult.ok ? undefined : webhookResult.description,
    message:            webhookResult.ok
      ? 'Token rotated and webhook re-registered. Your bot is live with the new token.'
      : 'Token stored but webhook registration failed. Use the webhook URL to register manually.',
  })
}
