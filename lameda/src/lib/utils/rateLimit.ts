/**
 * Customer rate limiting (STORY-017 / TD-004).
 *
 * Uses the messages table to count recent inbound messages per customer.
 * No Redis or extra infrastructure required — the DB is the source of truth.
 *
 * Default: 10 inbound messages per 60 seconds per customer per merchant.
 * This stops a rapid burst from triggering 10+ Claude API calls in a row.
 *
 * Fails OPEN: if the DB check itself errors, we allow the message through.
 * A false positive block (wrongly rate-limiting a real customer) is worse
 * than a false negative (letting one extra burst through during a DB hiccup).
 *
 * FUTURE: Move to a sliding window counter in Redis (pg-boss or Upstash)
 * when message volume exceeds ~1000 active concurrent conversations.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const DEFAULT_WINDOW_SECONDS = 60
const DEFAULT_MAX_MESSAGES   = 10

export interface RateLimitResult {
  allowed: boolean
  /** Number of messages sent in the current window */
  count: number
}

export async function checkCustomerRateLimit(
  merchantId: string,
  customerId: string,
  maxMessages = DEFAULT_MAX_MESSAGES,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
): Promise<RateLimitResult> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .eq('direction', 'inbound')
    .gte('created_at', since)

  if (error) {
    logger.warn({ err: error, customerId, merchantId }, 'Rate limit DB check failed — allowing through')
    return { allowed: true, count: 0 }
  }

  const current = count ?? 0
  return { allowed: current < maxMessages, count: current }
}
