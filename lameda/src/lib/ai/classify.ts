import { getAIClient, AI_MODELS } from './client'
import type { ClassifiedIntent, Intent } from '@/lib/conversation/types'
import { logger } from '@/lib/utils/logger'

/**
 * Classifies the customer's intent from a raw message.
 *
 * Uses Claude Haiku for speed and cost efficiency (~$0.001 per call).
 * Returns a structured ClassifiedIntent with extracted entities.
 *
 * WHY STRUCTURED OUTPUT:
 * We ask Claude to return JSON instead of prose. This makes the result
 * deterministic and parseable without regex hacks. If Claude returns
 * invalid JSON (rare), we fall back to 'unknown' intent gracefully.
 *
 * NIGERIAN CONTEXT:
 * The system prompt is tuned for Nigerian fashion retail - pidgin phrases,
 * local sizing conventions (UK sizes common in Nigeria), Naira prices.
 */

const CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for a Nigerian fashion retail WhatsApp/Telegram bot called Lameda.

Classify the customer's message into exactly one intent from this list:
- greeting: Hello, hi, good morning, /start, any greeting
- social_phrase: Thank you, thanks, okay, ok, great, noted, got it, received, alright — pure acknowledgements with no shopping request
- browse_products: Show me products, what do you have, catalog, I want to see dresses
- product_inquiry: Questions about a specific product (size, color, price, availability)
- add_to_cart: Customer wants to buy or add something to their cart
- view_cart: Show my cart, what's in my basket, my selections
- remove_from_cart: Remove something from cart
- checkout: Ready to buy, proceed to checkout, I want to pay
- provide_address: Customer is giving a delivery address
- confirm_order: Yes, confirm, I agree, proceed with order
- cancel: No, cancel, stop, nevermind, I changed my mind
- order_status: Where is my order, track order, order update, delivery status, when will my order arrive
- complaint: Wrong item received, return, refund, damaged goods, I got the wrong thing, complaint
- support: Help, general question not about products
- unknown: Cannot classify

Also extract relevant entities if present:
- productQuery: the PRODUCT NAME or attribute the customer wants (e.g. "ankara dress", "size 12 blazer"). NEVER set this to a generic phrase like "wetin you get", "what do you have", "show me" — leave null for those.
- size: clothing size mentioned (e.g. "12", "M", "XL", "42")
- color: color mentioned (e.g. "red", "black", "ankara print")
- quantity: number mentioned
- address: delivery address if provided

IMPORTANT: Nigerian pidgin is common. Examples:
- "abeg show me" = browse_products (productQuery: null)
- "wetin you get?" = browse_products (productQuery: null — this is a catalog request, NOT a product name)
- "I wan buy" = add_to_cart or checkout
- "e dey available?" = product_inquiry
- "where my order dey?" = order_status
- "dem send me wrong item" = complaint

CRITICAL:
- "where is my order", "where my order dey", "track my order" = order_status (NOT browse_products)
- "wrong item", "wrong product", "different item", "not what I ordered" = complaint (NOT browse_products)
- "thank you", "thanks", "okay", "ok", "noted" = social_phrase (NOT unknown)

Respond ONLY with valid JSON in this exact format:
{
  "intent": "one of the intents above",
  "confidence": "high|medium|low",
  "language": "en or pcm",
  "entities": {
    "productQuery": "string or null",
    "size": "string or null",
    "color": "string or null",
    "quantity": number or null,
    "address": "string or null"
  },
  "raw": "your interpretation of what customer wants in one sentence"
}

For "language": set to "pcm" if the message contains Nigerian Pidgin phrases (abeg, dey, wetin, wahala, na, abi, sha, e don, make e, etc). Set to "en" otherwise.`

const VALID_INTENTS = new Set<Intent>([
  'greeting', 'social_phrase', 'browse_products', 'product_inquiry', 'add_to_cart',
  'view_cart', 'remove_from_cart', 'checkout', 'provide_address',
  'confirm_order', 'cancel', 'order_status', 'complaint', 'support', 'unknown',
])

function fallbackIntent(raw: string): ClassifiedIntent {
  const lower = raw.toLowerCase().trim()

  // Greetings — no API call needed
  if (['/start', 'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'morning', 'evening'].some(g => lower.startsWith(g))) {
    return { intent: 'greeting', confidence: 'high', entities: {}, raw }
  }

  // Social acknowledgements — respond conversationally, never do a product search
  const socialExact = ['thank you', 'thanks', 'thank u', 'thnks', 'okay', 'ok', 'ok!', 'okay!', 'alright', 'noted', 'got it', 'received', 'sure', 'great', 'nice', 'cool', 'understood']
  if (socialExact.includes(lower) || socialExact.some(p => lower === p + '!')) {
    return { intent: 'social_phrase', confidence: 'high', entities: {}, raw }
  }

  // Order tracking — match before Claude to avoid misclassification
  if (/where.*(is|my|our).*(order|package|parcel|delivery|item)|track.*order|order.*(status|update|progress)|when.*arrive|my order/i.test(lower)) {
    return { intent: 'order_status', confidence: 'high', entities: {}, raw }
  }

  // Complaints — match before Claude
  if (/wrong (item|product|thing|size|color)|different (item|product)|not what i (ordered|bought)|return|refund|damaged|faulty|broken|dem send me wrong/i.test(lower)) {
    return { intent: 'complaint', confidence: 'high', entities: {}, raw }
  }

  return { intent: 'unknown', confidence: 'low', entities: {}, raw }
}

export async function classifyIntent(message: string): Promise<ClassifiedIntent> {
  // Short-circuit obvious cases locally to save API cost
  const trimmed = message.trim()
  if (trimmed.length < 3) return { intent: 'unknown', confidence: 'low', entities: {}, raw: trimmed }
  if (trimmed === '/start') return { intent: 'greeting', confidence: 'high', entities: {}, raw: trimmed }

  try {
    const response = await getAIClient().messages.create({
      model: AI_MODELS.classifier,
      max_tokens: 256,
      system: CLASSIFIER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmed }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Strip markdown code fences if Claude wrapped the JSON
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()

    const parsed = JSON.parse(cleaned)

    const intent: Intent = VALID_INTENTS.has(parsed.intent) ? parsed.intent : 'unknown'

    return {
      intent,
      confidence: parsed.confidence ?? 'medium',
      language: parsed.language === 'pcm' ? 'pcm' : 'en',
      entities: {
        productQuery: parsed.entities?.productQuery ?? undefined,
        size: parsed.entities?.size ?? undefined,
        color: parsed.entities?.color ?? undefined,
        quantity: parsed.entities?.quantity ?? undefined,
        address: parsed.entities?.address ?? undefined,
      },
      raw: parsed.raw ?? trimmed,
    }
  } catch (err) {
    logger.error({ err, message: trimmed.slice(0, 50) }, 'Intent classification failed - using fallback')
    return fallbackIntent(trimmed)
  }
}
