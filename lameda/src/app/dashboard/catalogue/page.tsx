import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { CatalogueClient } from './CatalogueClient'

export const dynamic = 'force-dynamic'

export default async function CataloguePage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')

  const db = createAdminClient()
  const { data: products } = await db
    .from('products')
    .select('id, name, description, price_kobo, category, stock_count, image_url, is_active')
    .eq('merchant_id', ctx.merchant.id)
    .order('is_active', { ascending: false })
    .order('name')

  return (
    <CatalogueClient
      products={products ?? []}
      isAdmin={ctx.role === 'admin'}
    />
  )
}
