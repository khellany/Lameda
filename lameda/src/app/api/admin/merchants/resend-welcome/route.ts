import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptPii, safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'
import { getEmailClient, FROM_ADDRESS } from '@/lib/email/client'
import { buildMerchantWelcomeEmail } from '@/lib/email/templates/merchant-welcome'

const BodySchema = z.object({
  api_key: z.string().min(1),
})

/**
 * POST /api/admin/merchants/resend-welcome
 *
 * Resends the onboarding welcome email for a merchant.
 * Generates a fresh temporary password and resets their Supabase auth account.
 *
 * Protected by ADMIN_SECRET header — never expose this endpoint publicly.
 *
 * Body: { api_key: string }
 * Header: x-admin-secret: <ADMIN_SECRET env var>
 */
export async function POST(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'api_key is required' }, { status: 422 })
  }

  const { api_key } = parsed.data
  const supabase = createAdminClient()

  // ── Fetch merchant (typed columns only) ──────────────────────────────────
  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('id, business_name, bot_name, email, owner_name, api_key')
    .eq('api_key', api_key)
    .single()

  if (fetchError || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const { data: authRow } = await supabase
    .from('merchants')
    .select('auth_user_id')
    .eq('api_key', api_key)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUserId = (authRow as any)?.auth_user_id as string | null ?? null

  // ── Decrypt PII ───────────────────────────────────────────────────────────
  let plaintextEmail: string
  let plaintextOwnerName: string
  try {
    plaintextEmail     = decryptPii(merchant.email)
    plaintextOwnerName = safeDecrypt(merchant.owner_name) ?? merchant.business_name
  } catch (err) {
    logger.error({ err, merchantId: merchant.id }, 'PII decryption failed for resend-welcome')
    return NextResponse.json({ error: 'Could not decrypt merchant PII' }, { status: 500 })
  }

  // ── Reset Supabase auth password ──────────────────────────────────────────
  const words = ['palm', 'bolt', 'jade', 'nova', 'reef', 'dusk', 'sage', 'kite', 'lime', 'wren']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  const newTempPassword = `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`

  if (authUserId) {
    const { error: resetError } = await supabase.auth.admin.updateUserById(
      authUserId,
      { password: newTempPassword }
    )
    if (resetError) {
      logger.error({ err: resetError, merchantId: merchant.id }, 'Failed to reset auth password for resend')
      return NextResponse.json({ error: 'Failed to reset merchant password' }, { status: 500 })
    }
  }

  // ── Build and send email ──────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { subject, html, text } = buildMerchantWelcomeEmail({
    ownerName:    plaintextOwnerName,
    businessName: merchant.business_name,
    botName:      merchant.bot_name,
    apiKey:       merchant.api_key,
    tempPassword: authUserId ? newTempPassword : '(contact support)',
    loginEmail:   plaintextEmail,
    appUrl,
  })

  const { data: emailData, error: emailError } = await getEmailClient().emails.send({
    from: FROM_ADDRESS,
    to:   plaintextEmail,
    subject,
    html,
    text,
  })

  if (emailError) {
    logger.error({ err: emailError, merchantId: merchant.id }, 'Resend welcome email rejected by Resend')
    return NextResponse.json(
      { error: 'Email delivery failed', detail: emailError },
      { status: 502 },
    )
  }

  logger.info(
    { merchantId: merchant.id, emailId: emailData?.id, to: '[REDACTED]' },
    'Welcome email resent',
  )

  return NextResponse.json({
    success: true,
    merchant_id: merchant.id,
    business_name: merchant.business_name,
    email_id: emailData?.id,
    password_reset: !!authUserId,
  })
}
