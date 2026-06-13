'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { logger } from '@/lib/utils/logger'

/**
 * Toggles whether the merchant is listed in the public /discover directory.
 * Called from the settings page toggle button.
 */
export async function setDirectoryListing(listed: boolean): Promise<{ error?: string }> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')

  const db = createAdminClient()

  const { error } = await db
    .from('merchants')
    .update({ is_directory_listed: listed })
    .eq('id', ctx.merchant.id)

  if (error) {
    logger.error({ err: error, merchantId: ctx.merchant.id }, 'setDirectoryListing failed')
    return { error: 'Failed to update directory setting. Please try again.' }
  }

  logger.info(
    { merchantId: ctx.merchant.id, listed, event: 'directory.listing_changed' },
    'Merchant directory listing toggled',
  )
  return {}
}
