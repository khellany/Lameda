/**
 * GET /api/cron/bot-health
 *
 * STORY-033 — Daily bot health scoring.
 * Checks every active merchant's bot token and recent broadcast delivery rate,
 * then writes a 0-100 health score so the dashboard can surface delivery risk
 * before it silently hurts conversion.
 *
 * Score formula:
 *   - Token invalid (getMe fails)       → 0
 *   - Token valid, no sends in 7 days   → 85 (benefit of the doubt)
 *   - Token valid + broadcast history   → 50 + round(success_rate × 50)
 *
 * Schedule: daily 06:00 UTC via cron-job.org (`0 6 * * *`) — before the digest at 07:00.
 * See docs/CRON_SETUP.md. Auth: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBotToken } from '@/lib/telegram/webhook'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

const LOOKBACK_DAYS = 7

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date()
  const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: merchants, error } = await db
    .from('merchants')
    .select('id, telegram_bot_token')
    .eq('is_active', true)

  if (error || !merchants) {
    logger.error({ err: error }, 'bot-health: failed to fetch merchants')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  let scored = 0
  let skipped = 0
  let failed = 0

  for (const m of merchants) {
    const rawToken = m.telegram_bot_token
      ? safeDecrypt(m.telegram_bot_token) ?? m.telegram_bot_token
      : null

    if (!rawToken) {
      skipped++
      continue
    }

    try {
      // Step 1: token validity (contributes 50 pts)
      const { valid } = await validateBotToken(rawToken)
      if (!valid) {
        await db.from('merchants').update({
          bot_health_score: 0,
          bot_health_checked_at: now.toISOString(),
        }).eq('id', m.id)
        scored++
        continue
      }

      // Step 2: broadcast delivery rate over the last LOOKBACK_DAYS (contributes 50 pts)
      // broadcast_recipients joins through broadcast_campaigns (which holds merchant_id)
      const { data: campaigns } = await db
        .from('broadcast_campaigns')
        .select('id')
        .eq('merchant_id', m.id)
        .gte('created_at', lookbackStart)

      const campaignIds = (campaigns ?? []).map((c) => c.id)
      let score: number

      if (campaignIds.length === 0) {
        // Token valid but no sends in the window — benefit of the doubt
        score = 85
      } else {
        const { data: recipients } = await db
          .from('broadcast_recipients')
          .select('delivered')
          .in('campaign_id', campaignIds)
          .limit(1000)

        const total = recipients?.length ?? 0
        if (total === 0) {
          score = 85
        } else {
          const delivered = (recipients ?? []).filter((r) => r.delivered).length
          score = 50 + Math.round((delivered / total) * 50)
        }
      }

      await db.from('merchants').update({
        bot_health_score: score,
        bot_health_checked_at: now.toISOString(),
      }).eq('id', m.id)

      scored++
    } catch (err) {
      failed++
      logger.error({ err, merchantId: m.id }, 'bot-health: merchant check threw')
    }
  }

  logger.info(
    { scored, skipped, failed, total: merchants.length },
    'bot-health cron complete',
  )
  return NextResponse.json({ ok: true, scored, skipped, failed, total: merchants.length })
}
