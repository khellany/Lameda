import Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic SDK singleton.
 *
 * Two models are used:
 * - claude-haiku-4-5  → Intent classification. Fast (~200ms), cheap (~$0.001 per message).
 *                       Called on EVERY incoming message.
 * - claude-sonnet-4-5 → Response generation. Higher quality, used selectively
 *                       (product descriptions, complex answers, checkout summaries).
 *
 * TECHNICAL DEBT:
 * - No prompt caching configured yet. At 500+ merchants, enable Anthropic's
 *   prompt caching on the system prompt prefix to cut costs ~90%.
 *   See: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 * - Token usage is not tracked per merchant yet. Add to ai_content_cache
 *   or a separate usage_logs table at Sprint 4 for cost attribution.
 */

let _client: Anthropic | null = null

export function getAIClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return _client
}

export const AI_MODELS = {
  /** Fast classification — called on every message */
  classifier: 'claude-haiku-4-5' as const,
  /** Response generation — called when a reply needs natural language */
  responder: 'claude-sonnet-4-5' as const,
}
