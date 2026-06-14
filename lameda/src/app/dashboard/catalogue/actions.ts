'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'

export interface CatalogueActionResult {
  success: boolean
  error?: string
}

export interface ImportResult {
  success: boolean
  imported?: number
  errors?: string[]
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePrice(raw: string | null): number | null {
  const n = parseFloat(raw ?? '')
  if (isNaN(n) || n < 0) return null
  return Math.round(n * 100) // Naira → kobo
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)
}

// ── Single-product mutations ──────────────────────────────────────────────────

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await db.from('products').insert({
    merchant_id:  ctx.merchant.id,
    name,
    description:  formData.get('description')?.toString().trim() || null,
    price_kobo:   priceKobo,
    category:     formData.get('category')?.toString().trim() || null,
    stock_count:  parseInt(formData.get('stock')?.toString() ?? '', 10) || null,
    image_url:    formData.get('image_url')?.toString().trim() || null,
    tags:         parseTags(formData.get('tags')?.toString() ?? ''),
    is_active:    true,
  } as any)

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await db
    .from('products')
    .update({
      name,
      description: formData.get('description')?.toString().trim() || null,
      price_kobo:  priceKobo,
      category:    formData.get('category')?.toString().trim() || null,
      stock_count: parseInt(formData.get('stock')?.toString() ?? '', 10) || null,
      image_url:   formData.get('image_url')?.toString().trim() || null,
      tags:        parseTags(formData.get('tags')?.toString() ?? ''),
    } as any)
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

// ── CSV import ────────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  starter: 100,
  growth:  500,
  pro:     Infinity,
}

/** Parse a single CSV row, respecting double-quoted fields. */
function parseCsvRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Parse CSV text into an array of header-keyed row objects. */
function parseCsvText(raw: string): Record<string, string>[] {
  const text = raw
    .replace(/^﻿/, '') // strip BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim() })
    rows.push(row)
  }
  return rows
}

export async function importFromCsv(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return { success: false, error: 'Not authenticated.' }
  if (ctx.role !== 'admin') return { success: false, error: 'Admin only.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, error: 'Please select a CSV file.' }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { success: false, error: 'File must be a .csv file.' }
  }

  const limit = PLAN_LIMITS[ctx.merchant.subscription_tier] ?? 100
  const text = await file.text()
  const rows = parseCsvText(text)

  if (rows.length === 0) {
    return { success: false, error: 'CSV is empty or missing a header row.' }
  }

  const firstRow = rows[0]
  if (!('name' in firstRow) || !('price_ngn' in firstRow)) {
    return { success: false, error: 'CSV must include "name" and "price_ngn" column headers.' }
  }

  const toImport = rows.slice(0, limit)
  const skippedByLimit = rows.length > limit ? rows.length - limit : 0

  const db = createAdminClient()
  const rowErrors: string[] = []
  const inserts: object[] = []

  toImport.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-based + skip header

    const name = row['name']?.trim()
    if (!name) { rowErrors.push(`Row ${rowNum}: "name" is required.`); return }

    const priceNaira = parseFloat(row['price_ngn'] ?? '')
    if (isNaN(priceNaira) || priceNaira < 0) {
      rowErrors.push(`Row ${rowNum}: "price_ngn" must be a valid number.`)
      return
    }

    const stockRaw = row['stock_count']?.trim()
    const stock = stockRaw ? parseInt(stockRaw, 10) : null
    if (stockRaw && isNaN(stock as number)) {
      rowErrors.push(`Row ${rowNum}: "stock_count" must be a whole number.`)
      return
    }

    // In CSV, tags use semicolons (commas are the column delimiter)
    const tags = (row['tags'] ?? '')
      .split(';')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)

    const sizes = (row['sizes'] ?? '')
      .split('|').map(s => s.trim()).filter(Boolean)

    const colors = (row['colors'] ?? '')
      .split('|').map(c => c.trim()).filter(Boolean)

    inserts.push({
      merchant_id:  ctx.merchant!.id,
      name,
      description:  row['description']?.trim() || null,
      price_kobo:   Math.round(priceNaira * 100),
      category:     row['category']?.trim() || null,
      stock_count:  stock,
      image_url:    row['image_url']?.trim() || null,
      tags,
      sizes:        sizes.length > 0 ? sizes : [],
      colors:       colors.length > 0 ? colors : [],
      is_active:    true,
    })
  })

  if (inserts.length === 0) {
    return { success: false, errors: rowErrors, error: 'No valid rows to import.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await db.from('products').insert(inserts as any)
  if (dbError) return { success: false, error: dbError.message }

  revalidatePath('/dashboard/catalogue')

  const allErrors = [
    ...rowErrors,
    ...(skippedByLimit > 0
      ? [`${skippedByLimit} row(s) skipped — your plan allows ${limit} products. Upgrade to import more.`]
      : []),
  ]

  return {
    success: true,
    imported: inserts.length,
    errors: allErrors.length > 0 ? allErrors : undefined,
  }
}
