/**
 * Telegram bot setup script.
 *
 * Run this once after creating your bot with BotFather to:
 * 1. Verify the bot token is valid
 * 2. Register the webhook URL with Telegram
 * 3. Insert or update the merchant record in Supabase
 *
 * Usage:
 *   node scripts/setup-telegram.mjs
 *
 * Prerequisites:
 * - TELEGRAM_BOT_TOKEN set in .env.local
 * - TELEGRAM_WEBHOOK_SECRET set in .env.local
 * - NEXT_PUBLIC_APP_URL set in .env.local (must be a public HTTPS URL)
 * - A merchant row exists in the database OR this script creates one
 *
 * For local development, use ngrok or Cloudflare Tunnel to get a public URL:
 *   npx cloudflared tunnel --url http://localhost:3000
 * Then set NEXT_PUBLIC_APP_URL to the tunnel URL in .env.local.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET
const APP_URL = env.NEXT_PUBLIC_APP_URL
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!BOT_TOKEN || !WEBHOOK_SECRET || !APP_URL || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables. Check .env.local.')
  console.error('Required: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

// Step 1: Verify bot token
console.log('\n1. Verifying bot token...')
const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
const meData = await meRes.json()

if (!meData.ok) {
  console.error('Invalid bot token:', meData.description)
  process.exit(1)
}

const botUsername = meData.result.username
const botName = meData.result.first_name
console.log(`   Bot verified: @${botUsername} (${botName})`)

// Step 2: Get or create merchant record
console.log('\n2. Looking up merchant record...')
const { data: merchants } = await supabase
  .from('merchants')
  .select('id, business_name, telegram_bot_token')
  .limit(5)

let merchantId

if (!merchants || merchants.length === 0) {
  // No merchant exists - create a test merchant
  console.log('   No merchant found. Creating test merchant...')
  const { data: newMerchant, error } = await supabase
    .from('merchants')
    .insert({
      business_name: 'Test Fashion Store',
      owner_name: 'Dayo Kelani',
      email: 'hello@lameda.ng',
      whatsapp_number: '+2340000000000', // placeholder
      telegram_bot_token: BOT_TOKEN,
      bot_name: botName,
      subscription_tier: 'growth',
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    })
    .select('id, business_name')
    .single()

  if (error) {
    console.error('   Failed to create merchant:', error.message)
    process.exit(1)
  }

  merchantId = newMerchant.id
  console.log(`   Created merchant: ${newMerchant.business_name} (${merchantId})`)
} else {
  // Update first merchant with bot token
  merchantId = merchants[0].id
  await supabase
    .from('merchants')
    .update({ telegram_bot_token: BOT_TOKEN, bot_name: botName })
    .eq('id', merchantId)

  console.log(`   Using merchant: ${merchants[0].business_name} (${merchantId})`)
}

// Step 3: Register webhook
const webhookUrl = `${APP_URL}/api/webhook/telegram/${merchantId}`
console.log(`\n3. Registering webhook...`)
console.log(`   URL: ${webhookUrl}`)

const webhookRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  }),
})

const webhookData = await webhookRes.json()

if (!webhookData.ok) {
  console.error('   Failed to register webhook:', webhookData.description)
  process.exit(1)
}

console.log('   Webhook registered successfully.')

// Step 4: Confirm webhook info
const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
const infoData = await infoRes.json()

console.log('\n4. Webhook info:')
console.log(`   URL:              ${infoData.result.url}`)
console.log(`   Pending updates:  ${infoData.result.pending_update_count}`)
console.log(`   Has secret token: ${infoData.result.has_custom_certificate === false && !!infoData.result.url}`)

console.log('\n✓ Setup complete.')
console.log(`\nSend a message to @${botUsername} on Telegram to test the webhook.`)
console.log(`Merchant ID: ${merchantId}`)
