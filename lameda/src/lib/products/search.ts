import { createAdminClient } from '@/lib/supabase/server'
import { generateTextEmbedding } from '@/lib/ai/embed'
import type { ProductSummary } from '@/lib/conversation/types'
import { logger } from '@/lib/utils/logger'

/**
 * Product catalog search — two-layer strategy.
 *
 * Layer 1: pgvector semantic search (STORY-015)
 *   Embeds the query with OpenAI text-embedding-3-small, finds the nearest
 *   product embeddings using cosine similarity via the search_products_by_embedding
 *   Supabase RPC. Requires OPENAI_API_KEY and products to be pre-embedded.
 *
 * Layer 2: pg_trgm trigram fallback (original)
 *   Used when:
 *   - OPENAI_API_KEY is not set (graceful degradation)
 *   - Vector search returns no results above the similarity threshold
 *   - Trigram always runs for an empty query (browse all)
 *
 * Callers do not need to know which layer fired.
 *
 * TECHNICAL DEBT (TD-007 resolved partially):
 * Sprint 3 adds vector search. Sprint 4 can improve recall by re-ranking
 * trigram results using embedding similarity when vector layer misses.
 */

const MAX_RESULTS = 5
const SIMILARITY_THRESHOLD = 0.5 // >50% similar — permissive for broad fashion terms

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export async function searchProducts(
  merchantId: string,
  query: string,
  filters?: { size?: string; color?: string },
): Promise<ProductSummary[]> {
  // Empty query → show all products (browse mode, skip vector search)
  if (!query.trim()) {
    return fetchAllProducts(merchantId, filters)
  }

  // Try vector search first
  const vectorResults = await vectorSearch(merchantId, query)
  if (vectorResults.length > 0) {
    logger.info({ query, count: vectorResults.length }, 'Vector search hit')
    return applyFilters(vectorResults, filters)
  }

  // Fall back to trigram
  logger.info({ query }, 'Vector search missed — using trigram fallback')
  return trigramSearch(merchantId, query, filters)
}

/** Fetch a single product by ID */
export async function getProductById(
  merchantId: string,
  productId: string,
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

  return mapProduct(data)
}

// ----------------------------------------------------------------
// Vector search (Layer 1)
// ----------------------------------------------------------------

async function vectorSearch(
  merchantId: string,
  query: string,
): Promise<ProductSummary[]> {
  const embedding = await generateTextEmbedding(query)
  if (!embedding) return [] // OPENAI_API_KEY not set or API call failed

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('search_products_by_embedding', {
    p_merchant_id: merchantId,
    p_embedding: embedding,
    p_threshold: SIMILARITY_THRESHOLD,
    p_limit: MAX_RESULTS,
  })

  if (error) {
    logger.error({ err: error, query }, 'pgvector RPC failed — falling back to trigram')
    return []
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    priceKobo: row.price_kobo,
    description: row.description,
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    imageUrl: row.image_url,
    category: row.category,
  }))
}

// ----------------------------------------------------------------
// Trigram search (Layer 2 / fallback)
// ----------------------------------------------------------------

async function trigramSearch(
  merchantId: string,
  query: string,
  filters?: { size?: string; color?: string },
): Promise<ProductSummary[]> {
  const supabase = createAdminClient()

  let dbQuery = supabase
    .from('products')
    .select('id, name, description, price_kobo, sizes, colors, image_url, category')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)

  if (query.trim()) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`,
    )
  }

  if (filters?.size) dbQuery = dbQuery.contains('sizes', [filters.size])
  if (filters?.color) dbQuery = dbQuery.contains('colors', [filters.color])

  const { data, error } = await dbQuery.limit(MAX_RESULTS)

  if (error) {
    logger.error({ err: error, merchantId, query }, 'Trigram search failed')
    return []
  }

  return (data ?? []).map(mapProduct)
}

// ----------------------------------------------------------------
// Browse all (no query)
// ----------------------------------------------------------------

async function fetchAllProducts(
  merchantId: string,
  filters?: { size?: string; color?: string },
): Promise<ProductSummary[]> {
  const supabase = createAdminClient()

  let dbQuery = supabase
    .from('products')
    .select('id, name, description, price_kobo, sizes, colors, image_url, category')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)

  if (filters?.size) dbQuery = dbQuery.contains('sizes', [filters.size])
  if (filters?.color) dbQuery = dbQuery.contains('colors', [filters.color])

  const { data, error } = await dbQuery.limit(MAX_RESULTS)

  if (error) {
    logger.error({ err: error, merchantId }, 'fetchAllProducts failed')
    return []
  }

  return (data ?? []).map(mapProduct)
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function applyFilters(
  products: ProductSummary[],
  filters?: { size?: string; color?: string },
): ProductSummary[] {
  if (!filters?.size && !filters?.color) return products
  return products.filter(p => {
    const sizeOk = !filters.size || p.sizes.includes(filters.size)
    const colorOk = !filters.color || p.colors.includes(filters.color)
    return sizeOk && colorOk
  })
}

function mapProduct(row: {
  id: string
  name: string
  description: string | null
  price_kobo: number
  sizes: string[] | null
  colors: string[] | null
  image_url: string | null
  category: string | null
}): ProductSummary {
  return {
    id: row.id,
    name: row.name,
    priceKobo: row.price_kobo,
    description: row.description,
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    imageUrl: row.image_url,
    category: row.category,
  }
}
