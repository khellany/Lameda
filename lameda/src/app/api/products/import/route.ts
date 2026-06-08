/**
 * POST /api/products/import
 *
 * Bulk product import from CSV (STORY-012).
 *
 * Expected CSV format (header row required):
 *   name,description,price_ngn,category,sizes,colors,image_url,stock_count
 *
 * - price_ngn     : price in Naira (converted to kobo × 100 internally)
 * - sizes         : pipe-delimited  e.g. "S|M|L|XL"
 * - colors        : pipe-delimited  e.g. "Red|Blue|Black"
 * - description, image_url, stock_count: optional (may be empty)
 *
 * Response:
 *   { imported: number, skipped: number, errors: Array<{ row, reason }> }
 *
 * Auth: X-Merchant-Id + X-Api-Key (= MERCHANT_API_KEY env var)
 *
 * After a successful import the caller should hit
 *   POST /api/products/embed-all
 * to generate embeddings for all newly created products.
 *
 * TECHNICAL DEBT:
 * Replace header-based auth with merchant JWT once E1 auth stories ship.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateTextEmbedding, buildProductTextContent } from '@/lib/ai/embed'
import { logger } from '@/lib/utils/logger'

const MAX_ROWS = 100 // Starter plan limit; enforce per plan in future

// ----------------------------------------------------------------
// Route handler
// ----------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Auth
  const merchantId = request.headers.get('x-merchant-id')
  const apiKey = request.headers.get('x-api-key')

  if (!merchantId || apiKey !== process.env.MERCHANT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Read body as text
  const body = await request.text()
  if (!body.trim()) {
    return NextResponse.json({ error: 'Empty CSV body' }, { status: 400 })
  }

  // Parse CSV
  const { rows, parseErrors } = parseCsv(body)

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'No valid rows found', parseErrors },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const imported: string[] = []  // product IDs successfully created
  const skipped: number[] = []
  const errors: Array<{ row: number; reason: string }> = [...parseErrors]

  // Slice to plan limit (first 100 rows processed)
  const toProcess = rows.slice(0, MAX_ROWS)
  if (rows.length > MAX_ROWS) {
    logger.warn({ merchantId, total: rows.length }, `CSV has ${rows.length} rows — truncated to ${MAX_ROWS}`)
  }

  for (const { lineNumber, data } of toProcess) {
    const validation = validateRow(data)
    if (!validation.ok) {
      errors.push({ row: lineNumber, reason: validation.reason })
      skipped.push(lineNumber)
      continue
    }

    const { error: insertError, data: inserted } = await supabase
      .from('products')
      .insert({
        merchant_id: merchantId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price_kobo: Math.round(parseFloat(data.price_ngn) * 100),
        category: data.category?.trim() || null,
        sizes: data.sizes ? data.sizes.split('|').map(s => s.trim()).filter(Boolean) : [],
        colors: data.colors ? data.colors.split('|').map(c => c.trim()).filter(Boolean) : [],
        image_url: data.image_url?.trim() || null,
        stock_count: data.stock_count ? parseInt(data.stock_count, 10) : null,
        is_active: true,
        metadata: {},
      })
      .select('id')
      .single()

    if (insertError) {
      logger.error({ err: insertError, lineNumber }, 'Product insert failed')
      errors.push({ row: lineNumber, reason: insertError.message })
      skipped.push(lineNumber)
    } else if (inserted) {
      imported.push(inserted.id)
    }
  }

  // Generate embeddings for successfully imported products (best-effort, non-blocking)
  if (process.env.OPENAI_API_KEY && imported.length > 0) {
    embedProductsBatch(merchantId, imported, supabase).catch(err =>
      logger.error({ err }, 'Background embedding generation failed'),
    )
  }

  logger.info(
    { merchantId, imported: imported.length, skipped: skipped.length },
    'CSV import complete',
  )

  return NextResponse.json({
    ok: true,
    imported: imported.length,
    skipped: skipped.length,
    errors: errors.length > 0 ? errors : undefined,
    note:
      imported.length > 0 && !process.env.OPENAI_API_KEY
        ? 'Set OPENAI_API_KEY to enable semantic search on imported products.'
        : undefined,
  })
}

// ----------------------------------------------------------------
// Background embedding generation
// ----------------------------------------------------------------

async function embedProductsBatch(
  merchantId: string,
  productIds: string[],
  supabase: ReturnType<typeof createAdminClient>,
) {
  // Fetch name/description/category for each product
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, category')
    .in('id', productIds)

  if (!products) return

  for (const product of products) {
    try {
      const textContent = buildProductTextContent(product)
      const embedding = await generateTextEmbedding(textContent)
      if (!embedding) continue

      await supabase.from('product_embeddings').upsert(
        {
          product_id: product.id,
          merchant_id: merchantId,
          text_content: textContent,
          embedding,
          model_version: 'text-embedding-3-small',
        },
        { onConflict: 'product_id' },
      )
    } catch (err) {
      logger.error({ err, productId: product.id }, 'Embedding failed for product')
    }
  }

  logger.info({ count: products.length }, 'Batch embedding complete')
}

// ----------------------------------------------------------------
// CSV parser (no external deps)
// ----------------------------------------------------------------

interface CsvRow {
  lineNumber: number
  data: Record<string, string>
}

interface ParseResult {
  rows: CsvRow[]
  parseErrors: Array<{ row: number; reason: string }>
}

function parseCsv(raw: string): ParseResult {
  // Strip BOM
  const text = raw.replace(/^﻿/, '')
  const lines = text.split(/\r?\n/).filter(l => l.trim())

  if (lines.length < 2) {
    return { rows: [], parseErrors: [{ row: 0, reason: 'CSV must have a header row and at least one data row' }] }
  }

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim())
  const rows: CsvRow[] = []
  const parseErrors: Array<{ row: number; reason: string }> = []

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1 // 1-indexed, header is row 1
    const values = splitCsvLine(lines[i])

    if (values.length !== headers.length) {
      parseErrors.push({ row: lineNumber, reason: `Expected ${headers.length} columns, got ${values.length}` })
      continue
    }

    const data: Record<string, string> = {}
    headers.forEach((h, idx) => { data[h] = values[idx] })
    rows.push({ lineNumber, data })
  }

  return { rows, parseErrors }
}

/** Split a single CSV line respecting double-quoted fields */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // Escaped quote ("") inside a quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
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

// ----------------------------------------------------------------
// Row validation
// ----------------------------------------------------------------

type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string }

function validateRow(data: Record<string, string>): ValidationResult {
  if (!data.name?.trim()) return { ok: false, reason: 'name is required' }

  if (!data.price_ngn?.trim()) return { ok: false, reason: 'price_ngn is required' }

  const price = parseFloat(data.price_ngn)
  if (isNaN(price) || price <= 0) {
    return { ok: false, reason: `price_ngn "${data.price_ngn}" is not a valid positive number` }
  }

  return { ok: true }
}
