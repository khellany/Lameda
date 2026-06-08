import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBotToken, registerTelegramWebhook } from '@/lib/telegram/webhook'
import { encryptPii } from '@/lib/crypto/pii'
import { hashForSearch } from '@/lib/crypto/hash'
import { logger } from '@/lib/utils/logger'
import { getEmailClient, FROM_ADDRESS } from '@/lib/email/client'
import { buildMerchantWelcomeEmail } from '@/lib/email/templates/merchant-welcome'
import type { BusinessType } from '@/lib/merchant/config'

const RegisterSchema = z.object({
  business_name: z.string().min(2).max(100),
  owner_name: z.string().min(2).max(100),
  email: z.string().email(),
  whatsapp_number: z.string().optional(),
  business_type: z.enum(['fashion', 'food', 'electronics', 'beauty', 'services', 'general']),
  telegram_bot_token: z.string().min(10),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const data = parsed.data

  // Validate bot token is real before touching the DB
  const { valid, botName } = await validateBotToken(data.telegram_bot_token)
  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid Telegram bot token. Get one from @BotFather on Telegram.' },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()

  // Generate a per-merchant API key before insert
  const apiKey = `lmd_${crypto.randomUUID().replace(/-/g, '')}`

  // Encrypt PII fields before writing to database
  const encryptedEmail     = encryptPii(data.email)
  const encryptedOwnerName = encryptPii(data.owner_name)
  const encryptedBotToken  = encryptPii(data.telegram_bot_token)
  const emailHash          = hashForSearch(data.email)

  // Insert merchant row — all PII fields are ciphertext from here
  const { data: merchant, error: insertError } = await supabase
    .from('merchants')
    .insert({
      business_name: data.business_name,
      owner_name: encryptedOwnerName,
      email: encryptedEmail,
      email_hash: emailHash,
      whatsapp_number: data.whatsapp_number ?? null,
      business_type: data.business_type as BusinessType,
      telegram_bot_token: encryptedBotToken,
      bot_name: botName ?? data.business_name,
      subscription_tier: 'starter',
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      api_key: apiKey,
      is_active: true,
    })
    .select('id, business_name, api_key')
    .single()

  if (insertError || !merchant) {
    logger.error({ err: insertError }, 'Merchant insert failed')
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 },
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const resolvedBotName = botName ?? data.business_name

  // Register Telegram webhook using the plaintext token (in-memory, never re-read from DB)
  const webhookResult = await registerTelegramWebhook(
    data.telegram_bot_token,
    merchant.id,
    appUrl,
    process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
  )

  logger.info(
    { merchantId: merchant.id, webhookOk: webhookResult.ok },
    'Merchant registered via self-service',
  )

  // Send welcome email with API key + Telegram deep link + CRM portal link.
  // Non-blocking: email failure should not prevent a successful registration response.
  const { subject, html, text } = buildMerchantWelcomeEmail({
    ownerName: data.owner_name,
    businessName: data.business_name,
    botName: resolvedBotName,
    apiKey,
    appUrl,
  })

  try {
    await getEmailClient().emails.send({
      from: FROM_ADDRESS,
      to: data.email,
      subject,
      html,
      text,
    })
    logger.info({ merchantId: merchant.id }, 'Welcome email sent')
  } catch (emailErr) {
    // Log but don't fail — merchant is registered, they saw the key on screen
    logger.error({ err: emailErr, merchantId: merchant.id }, 'Welcome email failed to send')
  }

  return NextResponse.json({
    success: true,
    business_name: merchant.business_name,
    api_key: apiKey,
    bot_name: resolvedBotName,
    telegram_link: `https://t.me/${resolvedBotName}?start=${apiKey}`,
    email_sent: true,
  })
}
