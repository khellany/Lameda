/**
 * POST /api/products/embed-all
 *
 * Generates (or regenerates) embeddings for ALL active products belonging
 * to a merchant that do not yet have an embedding, or whose embedding is
 * on an older model version.
 *
 * Use this to:
 *   - Activate semantic search on an existing product catalog
 *   - Re-embed after a model version upgrade
 *
 * The endpoint processes products in batches to avoid Vercel's 10-second
 * serverless timeout. Each batch of 10 products is embedded sequentially
 * (OpenAI embedding calls are fast ~50ms each).
 *
 * Response:
 *   { processed: number, skipped: number, failed: number, total: number }
 *
 * Auth: X-Merchant-Api-Key: lmd_xxxxx  (per-merchant key from onboarding)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateTextEmbedding, buildProductTextContent } from '@/lib/ai/embed'
import { logger } from '@/lib/utils/logger'

const CURRENT_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 10

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const merchantApiKey = request.headers.get('x-merchant-api-key')

  if (!merchantApiKey) {
    return NextResponse.json({ error: 'Missing X-Merchant-Api-Key header' }, { status: 401 })
  }

  const { data: merchantRow } = await supabase
    .from('merchants')
    .select('id')
    .eq('api_key', merchantApiKey)
    .eq('is_active', true)
    .maybeSingle()

  if (!merchantRow) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const merchantId = merchantRow.id

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 })
  }

  // Fetch all active products for this merchant
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, category')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0, failed: 0, total: 0 })
  }

  // Fetch which products already have an up-to-date embedding
  const { data: existing } = await supabase
    .from('product_embeddings')
    .select('product_id, model_version')
    .eq('merchant_id', merchantId)

  const embeddedIds = new Set(
    (existing ?? [])
      .filter(e => e.model_version === CURRENT_MODEL)
      .map(e => e.product_id),
  )

  const toEmbed = products.filter(p => !embeddedIds.has(p.id))

  if (toEmbed.length === 0) {
    return NextResponse.json({
      processed: 0,
      skipped: products.length,
      failed: 0,
      total: products.length,
      message: 'All products already have up-to-date embeddings.',
    })
  }

  let processed = 0
  let failed = 0

  // Process in batches
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE)

    for (const product of batch) {
      try {
        const textContent = buildProductTextContent(product)
        const embedding = await generateTextEmbedding(textContent)

        if (!embedding) {
          failed++
          continue
        }

        const { error: upsertError } = await supabase
          .from('product_embeddings')
          .upsert(
            {
              product_id: product.id,
              merchant_id: merchantId,
              text_content: textContent,
              embedding: embedding as unknown as string,
              model_version: CURRENT_MODEL,
            },
            { onConflict: 'product_id' },
          )

        if (upsertError) {
          logger.error({ err: upsertError, productId: product.id }, 'Embedding upsert failed')
          failed++
        } else {
          processed++
        }
      } catch (err) {
        logger.error({ err, productId: product.id }, 'Embedding generation threw')
        failed++
      }
    }
  }

  logger.info({ merchantId, processed, failed, total: products.length }, 'embed-all complete')

  return NextResponse.json({
    processed,
    skipped: embeddedIds.size,
    failed,
    total: products.length,
  })
}
