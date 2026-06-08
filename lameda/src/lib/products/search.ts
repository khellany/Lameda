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
// Categories
// ----------------------------------------------------------------

/** Returns distinct non-null categories for a merchant, sorted alphabetically. */
export async function getProductCategories(merchantId: string): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('category')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .not('category', 'is', null)

  if (error || !data) return []

  const unique = [...new Set(data.map(r => r.category as string))]
  return unique.sort()
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export async function searchProducts(
  merchantId: string,
  query: string,
  filters?: { size?: string; color?: string; category?: string },
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

/**
 * Returns in-stock size/color combinations for a product.
 * Used to filter variant selection menus — only shows options with stock > 0.
 * Falls back to the product's flat sizes/colors arrays when no variant rows exist.
 */
export async function getAvailableVariants(
  productId: string,
): Promise<{ sizes: string[]; colors: string[]; variantMap: Map<string, number> }> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('product_variants')
    .select('size, color, stock_count')
    .eq('product_id', productId)
    .eq('is_active', true)
    .gt('stock_count', 0)

  if (!data || data.length === 0) {
    // No variant rows — caller uses product.sizes / product.colors directly
    return { sizes: [], colors: [], variantMap: new Map() }
  }

  const sizes = [...new Set(data.filter(v => v.size).map(v => v.size!))]
  const colors = [...new Set(data.filter(v => v.color).map(v => v.color!))]
  const variantMap = new Map(data.map(v => [`${v.size ?? ''}|${v.color ?? ''}`, v.stock_count]))

  return { sizes, colors, variantMap }
}

/** Fetch a single product by ID */
export async function getProductById(
  merchantId: string,
  productId: string,
): Promise<ProductSummary | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price_kobo, sizes, colors, image_url, category, stock_count')
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
    stockCount: null, // RPC result doesn't include stock_count — fetched on product detail
  }))
}

// ----------------------------------------------------------------
// Trigram search (Layer 2 / fallback)
// ----------------------------------------------------------------

async function trigramSearch(
  merchantId: string,
  query: string,
  filters?: { size?: string; color?: string; category?: string },
): Promise<ProductSummary[]> {
  const supabase = createAdminClient()

  let dbQuery = supabase
    .from('products')
    .select('id, name, description, price_kobo, sizes, colors, image_url, category, stock_count')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)

  if (query.trim()) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`,
    )
  }

  if (filters?.category) dbQuery = dbQuery.eq('category', filters.category)
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
  filters?: { size?: string; color?: string; category?: string },
): Promise<ProductSummary[]> {
  const supabase = createAdminClient()

  let dbQuery = supabase
    .from('products')
    .select('id, name, description, price_kobo, sizes, colors, image_url, category, stock_count')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)

  if (filters?.category) dbQuery = dbQuery.eq('category', filters.category)
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
  filters?: { size?: string; color?: string; category?: string },
): ProductSummary[] {
  if (!filters?.size && !filters?.color && !filters?.category) return products
  return products.filter(p => {
    const categoryOk = !filters.category || p.category === filters.category
    const sizeOk = !filters.size || p.sizes.includes(filters.size)
    const colorOk = !filters.color || p.colors.includes(filters.color)
    return categoryOk && sizeOk && colorOk
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
  stock_count?: number | null
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
    stockCount: row.stock_count ?? null,
  }
}
