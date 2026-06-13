/**
 * GET /api/cron/merchant-digest
 *
 * STORY-025 — Daily merchant digest.
 * Sends each merchant a once-a-day Telegram summary of yesterday's activity to
 * their linked admin chat: orders received, paid revenue, new customers, and how
 * many orders are awaiting action. This is the daily-habit hook for the launch
 * gate ("merchants live and generating data").
 *
 * Recipient: merchants.admin_telegram_chat_id (set when the owner links their
 * Telegram via /register in their own bot — migration 011). Merchants without a
 * linked admin chat are skipped.
 *
 * Window: "yesterday" in WAT (Africa/Lagos, UTC+1, no DST).
 *
 * Schedule: daily 07:00 UTC (= 08:00 WAT) via cron-job.org (`0 7 * * *`). See docs/CRON_SETUP.md.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/telegram/client'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'
import type { Enums } from '@/types/database'

const WAT_OFFSET_MS = 60 * 60 * 1000 // West Africa Time = UTC+1, no DST
const PAID_STATUSES: Enums<'order_status'>[] = ['paid', 'shipped', 'delivered']
const OPEN_STATUSES: Enums<'order_status'>[] = ['pending', 'confirmed']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Yesterday's calendar day in WAT, as a UTC [start, end) range + a display label. */
function yesterdayWindowWat(now: Date): { startIso: string; endIso: string; label: string } {
  const watNow = new Date(now.getTime() + WAT_OFFSET_MS)
  // UTC instant of 00:00 WAT today:
  const startOfWatToday =
    Date.UTC(watNow.getUTCFullYear(), watNow.getUTCMonth(), watNow.getUTCDate()) - WAT_OFFSET_MS
  const start = new Date(startOfWatToday - 24 * 60 * 60 * 1000)
  const end = new Date(startOfWatToday)
  // Yesterday's WAT calendar components (shift so UTC getters read WAT wall-clock).
  const watYesterday = new Date(startOfWatToday - 24 * 60 * 60 * 1000 + WAT_OFFSET_MS)
  const label = `${watYesterday.getUTCDate()} ${MONTHS[watYesterday.getUTCMonth()]}`
  return { startIso: start.toISOString(), endIso: end.toISOString(), label }
}

export async function GET(request: NextRequest) {
  // Fail closed: reject if the cron secret is unset/empty OR doesn't match.
  // (`secret !== process.env.CRON_SECRET` alone passes when both are undefined.)
  const expected = process.env.CRON_SECRET
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const { startIso, endIso, label } = yesterdayWindowWat(new Date())

  // Only merchants who have linked an admin Telegram chat can receive a digest.
  const { data: merchants, error } = await db
    .from('merchants')
    .select('id, business_name, telegram_bot_token, admin_telegram_chat_id')
    .eq('is_active', true)
    .not('admin_telegram_chat_id', 'is', null)

  if (error || !merchants) {
    logger.error({ err: error }, 'merchant-digest: failed to fetch merchants')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const m of merchants) {
    const botToken = m.telegram_bot_token
      ? safeDecrypt(m.telegram_bot_token) ?? m.telegram_bot_token
      : null
    const chatId = m.admin_telegram_chat_id
    if (!botToken || !chatId) {
      skipped++
      continue
    }

    try {
      // Four scoped counts/sums per merchant. The first three are yesterday's
      // window; "awaiting action" is the current open backlog (all-time).
      const [ordersRes, revenueRes, newCustomersRes, openOrdersRes] = await Promise.all([
        db
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', m.id)
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        db
          .from('orders')
          .select('total_kobo')
          .eq('merchant_id', m.id)
          .in('status', PAID_STATUSES)
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        db
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', m.id)
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        db
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', m.id)
          .in('status', OPEN_STATUSES),
      ])

      const orders = ordersRes.count ?? 0
      const revenueKobo = (revenueRes.data ?? []).reduce((s, r) => s + (r.total_kobo ?? 0), 0)
      const newCustomers = newCustomersRes.count ?? 0
      const openOrders = openOrdersRes.count ?? 0

      const msg =
        `*📊 ${m.business_name} — Daily Summary*\n` +
        `_${label}_\n\n` +
        `📦 Orders: *${orders}*\n` +
        `💰 Revenue (paid): *${formatNaira(revenueKobo)}*\n` +
        `👥 New customers: *${newCustomers}*\n` +
        `⏳ Awaiting your action: *${openOrders}*\n\n` +
        (openOrders > 0
          ? `Send /orders to review pending orders.`
          : `All caught up! 🎉`)

      const result = await sendTextMessage(botToken, chatId, msg)
      if (result.success) {
        sent++
      } else {
        failed++
        logger.warn({ merchantId: m.id, error: result.error }, 'merchant-digest: send failed')
      }
    } catch (err) {
      failed++
      logger.error({ err, merchantId: m.id }, 'merchant-digest: merchant threw')
    }
  }

  logger.info({ sent, skipped, failed, total: merchants.length }, 'merchant-digest cron complete')
  return NextResponse.json({ ok: true, sent, skipped, failed, total: merchants.length })
}
