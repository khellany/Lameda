/**
 * Text embedding service using OpenAI text-embedding-3-small.
 *
 * Used for two purposes:
 *   1. Product indexing — embed name + description + category at creation/update time,
 *      store in product_embeddings for pgvector similarity search.
 *   2. Query embedding — embed the customer's search text (or Claude-extracted keywords
 *      from an image) at search time to find similar products.
 *
 * Using the same model for both guarantees embeddings live in the same vector space —
 * a prerequisite for meaningful cosine similarity comparisons.
 *
 * Model: text-embedding-3-small
 *   - 1536 dimensions (matches product_embeddings.embedding vector(1536))
 *   - ~$0.00002 per 1K tokens — negligible for this use case
 *   - ~50ms latency — fast enough to call inline during a customer conversation
 *
 * REQUIRES: OPENAI_API_KEY environment variable
 *
 * TECHNICAL DEBT (TD-008):
 * Sprint 4 should add CLIP image embeddings (via Replicate) so that a product photo
 * can be embedded directly without going through the Claude-text intermediary.
 * The product_embeddings table schema supports a future migration to vector(512)
 * for CLIP or keeping text embeddings in a separate column.
 */

import OpenAI from 'openai'
import { logger } from '@/lib/utils/logger'

const EMBEDDING_MODEL = 'text-embedding-3-small' as const
const EMBEDDING_DIMENSIONS = 1536

let _openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * Generate a 1536-dimensional embedding for a text string.
 * Returns null if the OpenAI API is not configured or the call fails.
 */
export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    // Graceful degradation — app works without embeddings (falls back to trigram)
    return null
  }

  try {
    const response = await getOpenAIClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // model limit: 8191 tokens
      dimensions: EMBEDDING_DIMENSIONS,
    })

    return response.data[0].embedding
  } catch (err) {
    logger.error({ err }, 'OpenAI embedding generation failed')
    return null
  }
}

/**
 * Build the text string used to embed a product.
 * Concatenates the fields most useful for semantic search.
 */
export function buildProductTextContent(product: {
  name: string
  description: string | null
  category: string | null
}): string {
  return [product.name, product.description, product.category]
    .filter(Boolean)
    .join(' | ')
}
