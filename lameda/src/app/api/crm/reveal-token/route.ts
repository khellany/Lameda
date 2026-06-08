/**
 * POST /api/crm/reveal-token
 *
 * MODEL 2 — Decrypt on demand with mandatory audit log.
 *
 * The bot token is never returned in any other CRM response — it appears
 * as "[PROTECTED]" everywhere else. This endpoint is the only way to see it.
 *
 * Every call writes an audit log entry BEFORE returning the token.
 * If the audit write fails, the token is NOT returned.
 *
 * Auth: X-Merchant-Api-Key header
 *
 * Why POST and not GET:
 *   GET URLs appear in Vercel access logs, CDN logs, and browser history.
 *   A POST body does not. The token must never appear in a URL.
 *
 * Rate limit: 5 reveals per hour per merchant (enforced in audit_logs count).
 * This limits damage if the API key is stolen — an attacker can only
 * reveal the token a limited number of times before the merchant notices
 * unusual audit activity.
 *
 * Use case:
 *   Business owner opens CRM → sees "Bot token: [PROTECTED] [Reveal]"
 *   → clicks Reveal → POST to this endpoint → token shown once in the UI
 *   → business owner copies it to BotFather for verification or rotation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveMerchantFromApiKey, getCallerIp } from '@/lib/crm/auth'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

const MAX_REVEALS_PER_HOUR = 5

export async function POST(request: NextRequest) {
  const merchant = await resolveMerchantFromApiKey(request)
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const callerIp = getCallerIp(request)
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  // Rate limit: count reveals in the last hour from audit_logs
  const { count: recentReveals } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)
    .eq('action', 'bot_token_revealed')
    .gte('created_at', oneHourAgo)

  if ((recentReveals ?? 0) >= MAX_REVEALS_PER_HOUR) {
    logger.warn({ merchantId: merchant.id }, 'Bot token reveal rate limit exceeded')
    return NextResponse.json(
      { error: `Token reveal limited to ${MAX_REVEALS_PER_HOUR} times per hour. Try again later.` },
      { status: 429 },
    )
  }

  // Fetch ONLY the bot token — minimal scoped select
  const { data: merchantCredentials, error: fetchError } = await supabase
    .from('merchants')
    .select('telegram_bot_token')
    .eq('id', merchant.id)
    .single()

  if (fetchError || !merchantCredentials?.telegram_bot_token) {
    logger.error({ merchantId: merchant.id, err: fetchError?.message }, 'Failed to fetch bot token for reveal')
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  // Audit-first: write the log BEFORE returning the token
  // If this insert fails, we return an error — no token revealed without a log entry
  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      merchant_id:   merchant.id,
      actor_type:    'merchant',
      action:        'bot_token_revealed',
      resource_type: 'merchant',
      resource_id:   merchant.id,
      metadata: {
        ip:           callerIp,
        user_agent:   request.headers.get('user-agent') ?? 'unknown',
        business:     merchant.business_name,
      },
      ip_address: callerIp,
    })

  if (auditError) {
    logger.error({ merchantId: merchant.id, err: auditError.message }, 'Audit log insert failed — reveal blocked')
    return NextResponse.json(
      { error: 'Could not record this action. Please try again.' },
      { status: 500 },
    )
  }

  // Decrypt and return — audit log is committed at this point
  const plainToken = safeDecrypt(merchantCredentials.telegram_bot_token)

  logger.info({ merchantId: merchant.id, ip: callerIp }, 'Bot token revealed — audit logged')

  return NextResponse.json({
    bot_token:   plainToken,
    revealed_at: now.toISOString(),
    warning:     'This token grants full control of your Telegram bot. Do not share it. Revoke via @BotFather if compromised.',
  })
}
