/**
 * POST /api/products/[productId]/embed
 *
 * Generates (or regenerates) the text embedding for a single product and
 * upserts it into the product_embeddings table.
 *
 * Call this:
 *   - After creating a new product
 *   - After updating name, description, or category
 *   - On a bulk re-embed job when the model version changes
 *
 * Auth: X-Merchant-Id + X-Api-Key (= MERCHANT_API_KEY env var)
 *
 * TECHNICAL DEBT:
 * Replace header-based auth with merchant JWT once E1 auth stories ship.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateTextEmbedding, buildProductTextContent } from '@/lib/ai/embed'
import { logger } from '@/lib/utils/logger'

interface RouteParams {
  params: Promise<{ productId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { productId } = await params

  // Auth
  const merchantId = request.headers.get('x-merchant-id')
  const apiKey = request.headers.get('x-api-key')

  if (!merchantId || apiKey !== process.env.MERCHANT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  const supabase = createAdminClient()

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, description, category, merchant_id')
    .eq('id', productId)
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Build text content
  const textContent = buildProductTextContent({
    name: product.name,
    description: product.description,
    category: product.category,
  })

  // Generate embedding
  const embedding = await generateTextEmbedding(textContent)

  if (!embedding) {
    return NextResponse.json({ error: 'Embedding generation failed' }, { status: 502 })
  }

  // Upsert into product_embeddings
  const { error: upsertError } = await supabase
    .from('product_embeddings')
    .upsert(
      {
        product_id: productId,
        merchant_id: merchantId,
        text_content: textContent,
        embedding,
        model_version: 'text-embedding-3-small',
      },
      { onConflict: 'product_id' },
    )

  if (upsertError) {
    logger.error({ err: upsertError, productId }, 'product_embeddings upsert failed')
    return NextResponse.json({ error: 'Database write failed' }, { status: 500 })
  }

  logger.info({ productId, merchantId, dims: embedding.length }, 'Product embedding stored')
  return NextResponse.json({ ok: true, productId, dims: embedding.length })
}
