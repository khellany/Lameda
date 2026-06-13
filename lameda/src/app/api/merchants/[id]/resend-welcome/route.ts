import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptPii } from '@/lib/crypto/pii'
import { getEmailClient, FROM_ADDRESS } from '@/lib/email/client'
import { buildMerchantWelcomeEmail } from '@/lib/email/templates/merchant-welcome'
import { logger } from '@/lib/utils/logger'

function generateTempPassword(): string {
  const words = ['palm', 'bolt', 'jade', 'nova', 'reef', 'dusk', 'sage', 'kite', 'lime', 'wren']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `${pick()}-${pick()}-${digits}`
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: merchantId } = await params
  if (!merchantId) {
    return NextResponse.json({ error: 'Missing merchant id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch the merchant row — we need email, owner_name, bot_name, api_key, auth_user_id
  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('id, business_name, owner_name, email, bot_name, api_key, auth_user_id, is_active')
    .eq('id', merchantId)
    .single()

  if (fetchError || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  if (!merchant.auth_user_id) {
    return NextResponse.json(
      { error: 'Merchant has no linked auth account — cannot reset credentials' },
      { status: 422 },
    )
  }

  // Decrypt PII fields
  let email: string
  let ownerName: string
  try {
    email     = decryptPii(merchant.email)
    ownerName = decryptPii(merchant.owner_name)
  } catch (err) {
    logger.error({ err, merchantId }, 'Failed to decrypt merchant PII for welcome resend')
    return NextResponse.json({ error: 'Failed to read merchant credentials' }, { status: 500 })
  }

  // Generate a fresh temporary password and update the auth account
  const tempPassword = generateTempPassword()
  const { error: pwError } = await supabase.auth.admin.updateUserById(merchant.auth_user_id, {
    password: tempPassword,
  })

  if (pwError) {
    logger.error({ err: pwError, merchantId }, 'Failed to reset auth password for welcome resend')
    return NextResponse.json({ error: 'Failed to reset merchant password' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { subject, html, text } = buildMerchantWelcomeEmail({
    ownerName,
    businessName: merchant.business_name,
    botName: merchant.bot_name,
    apiKey: merchant.api_key,
    tempPassword,
    loginEmail: email,
    appUrl,
  })

  const { data: emailData, error: emailError } = await getEmailClient().emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject,
    html,
    text,
  })

  if (emailError) {
    logger.error({ err: emailError, merchantId }, 'Welcome email rejected by Resend on resend attempt')
    return NextResponse.json(
      { error: 'Password was reset but email delivery failed', detail: emailError.message },
      { status: 502 },
    )
  }

  logger.info({ merchantId, emailId: emailData?.id }, 'Welcome email resent successfully')

  return NextResponse.json({ success: true, email_id: emailData?.id })
}
