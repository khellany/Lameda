'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'

export interface CatalogueActionResult {
  success: boolean
  error?: string
}

function parsePrice(raw: string | null): number | null {
  const n = parseFloat(raw ?? '')
  if (isNaN(n) || n < 0) return null
  return Math.round(n * 100) // Naira → kobo
}

export async function createProduct(
  _prev: CatalogueActionResult,
  formData: FormData,
): Promise<CatalogueActionResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return { success: false, error: 'Not authenticated.' }
  if (ctx.role !== 'admin') return { success: false, error: 'Admin only.' }

  const name = formData.get('name')?.toString().trim() ?? ''
  if (!name) return { success: false, error: 'Product name is required.' }

  const priceKobo = parsePrice(formData.get('price')?.toString() ?? '')
  if (priceKobo === null) return { success: false, error: 'Enter a valid price.' }

  const db = createAdminClient()
  const { error } = await db.from('products').insert({
    merchant_id:  ctx.merchant.id,
    name,
    description:  formData.get('description')?.toString().trim() || null,
    price_kobo:   priceKobo,
    category:     formData.get('category')?.toString().trim() || null,
    stock_count:  parseInt(formData.get('stock')?.toString() ?? '', 10) || null,
    image_url:    formData.get('image_url')?.toString().trim() || null,
    is_active:    true,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/catalogue')
  return { success: true }
}

export async function updateProduct(
  id: string,
  _prev: CatalogueActionResult,
  formData: FormData,
): Promise<CatalogueActionResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return { success: false, error: 'Not authenticated.' }
  if (ctx.role !== 'admin') return { success: false, error: 'Admin only.' }

  const name = formData.get('name')?.toString().trim() ?? ''
  if (!name) return { success: false, error: 'Product name is required.' }

  const priceKobo = parsePrice(formData.get('price')?.toString() ?? '')
  if (priceKobo === null) return { success: false, error: 'Enter a valid price.' }

  const db = createAdminClient()
  const { error } = await db
    .from('products')
    .update({
      name,
      description: formData.get('description')?.toString().trim() || null,
      price_kobo:  priceKobo,
      category:    formData.get('category')?.toString().trim() || null,
      stock_count: parseInt(formData.get('stock')?.toString() ?? '', 10) || null,
      image_url:   formData.get('image_url')?.toString().trim() || null,
    })
    .eq('id', id)
    .eq('merchant_id', ctx.merchant.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/catalogue')
  return { success: true }
}

export async function toggleProduct(id: string, isActive: boolean): Promise<void> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant || ctx.role !== 'admin') return

  const db = createAdminClient()
  await db
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('merchant_id', ctx.merchant.id)

  revalidatePath('/dashboard/catalogue')
}

export async function deleteProduct(id: string): Promise<void> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant || ctx.role !== 'admin') return

  const db = createAdminClient()
  await db
    .from('products')
    .delete()
    .eq('id', id)
    .eq('merchant_id', ctx.merchant.id)

  revalidatePath('/dashboard/catalogue')
}
