import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBotToken, registerTelegramWebhook } from '@/lib/telegram/webhook'
import { logger } from '@/lib/utils/logger'
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

  // Check if this bot token is already registered
  const { data: existing } = await supabase
    .from('merchants')
    .select('id')
    .eq('telegram_bot_token', data.telegram_bot_token)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'This Telegram bot is already registered. Contact support if you need to update it.' },
      { status: 409 },
    )
  }

  // Generate a per-merchant API key
  const apiKey = `lmd_${crypto.randomUUID().replace(/-/g, '')}`

  // Insert merchant row
  const { data: merchant, error: insertError } = await supabase
    .from('merchants')
    .insert({
      business_name: data.business_name,
      owner_name: data.owner_name,
      email: data.email,
      whatsapp_number: data.whatsapp_number ?? null,
      business_type: data.business_type as BusinessType,
      telegram_bot_token: data.telegram_bot_token,
      bot_name: botName ?? data.business_name,
      subscription_tier: 'starter',
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      api_key: apiKey,
      is_active: true,
    })
    .select('id, business_name, email, api_key')
    .single()

  if (insertError || !merchant) {
    logger.error({ err: insertError }, 'Merchant insert failed')
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  // Register Telegram webhook — non-fatal if it fails (merchant can retry)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
  const webhookResult = await registerTelegramWebhook(
    data.telegram_bot_token,
    merchant.id,
    appUrl,
    webhookSecret,
  )

  const webhookUrl = `${appUrl}/api/webhook/telegram/${merchant.id}`

  logger.info(
    { merchantId: merchant.id, webhookOk: webhookResult.ok },
    'Merchant registered via self-service',
  )

  return NextResponse.json({
    success: true,
    merchant_id: merchant.id,
    business_name: merchant.business_name,
    api_key: apiKey,
    bot_name: botName,
    webhook_url: webhookUrl,
    webhook_registered: webhookResult.ok,
    webhook_error: webhookResult.ok ? undefined : webhookResult.description,
    next_steps: {
      import_products: `POST ${appUrl}/api/products/import with header X-Merchant-Api-Key: ${apiKey}`,
      test_bot: `Open Telegram and message @${botName ?? 'your_bot'} to test`,
    },
  })
}
