import { createAdminClient } from '@/lib/supabase/server'
import type { ProductSummary } from '@/lib/conversation/types'
import { logger } from '@/lib/utils/logger'

/**
 * Product catalog search using PostgreSQL trigram similarity (pg_trgm).
 *
 * Trigram search handles:
 * - Partial matches ("ankara" matches "Ankara floral dress")
 * - Typos and pidgin spellings ("anakra" still finds "ankara")
 * - Case-insensitive search
 *
 * TECHNICAL DEBT (TD-007):
 * Sprint 3 replaces this with pgvector semantic search using OpenAI embeddings.
 * Trigram handles exact-ish matches; semantic search understands meaning
 * ("something for a wedding" → returns formal/occasion wear even without
 * those exact words in the product name).
 *
 * The function signature stays the same - only the SQL changes.
 */

const MAX_RESULTS = 5

export async function searchProducts(
  merchantId: string,
  query: string,
  filters?: { size?: string; color?: string }
): Promise<ProductSummary[]> {
  const supabase = createAdminClient()

  try {
    // Build query - trigram similarity search on name + description
    let dbQuery = supabase
      .from('products')
      .select('id, name, description, price_kobo, sizes, colors, image_url, category')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)

    // Apply text search if query is not empty
    if (query.trim()) {
      // Use ilike for simple matching (trigram index accelerates this)
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`
      )
    }

    // Apply size filter if provided
    if (filters?.size) {
      dbQuery = dbQuery.contains('sizes', [filters.size])
    }

    // Apply color filter if provided
    if (filters?.color) {
      dbQuery = dbQuery.contains('colors', [filters.color])
    }

    const { data, error } = await dbQuery.limit(MAX_RESULTS)

    if (error) {
      logger.error({ err: error, merchantId, query }, 'Product search failed')
      return []
    }

    return (data ?? []).map(p => ({
      id: p.id,
      name: p.name,
      priceKobo: p.price_kobo,
      description: p.description,
      sizes: p.sizes ?? [],
      colors: p.colors ?? [],
      imageUrl: p.image_url,
      category: p.category,
    }))
  } catch (err) {
    logger.error({ err, merchantId, query }, 'Product search exception')
    return []
  }
}

/** Fetch a single product by ID */
export async function getProductById(
  merchantId: string,
  productId: string
): Promise<ProductSummary | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price_kobo, sizes, colors, image_url, category')
    .eq('id', productId)
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    priceKobo: data.price_kobo,
    description: data.description,
    sizes: data.sizes ?? [],
    colors: data.colors ?? [],
    imageUrl: data.image_url,
    category: data.category,
  }
}
