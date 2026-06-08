import { getAIClient, AI_MODELS } from './client'
import { logger } from '@/lib/utils/logger'
import type { ProductSummary } from '@/lib/conversation/types'

/**
 * AI response generator using Claude Sonnet.
 *
 * Used selectively — only when a natural language response is needed
 * (product descriptions, complex answers, empathetic support replies).
 * Simple responses (cart totals, order confirmations) are templated
 * strings in the handlers, not AI-generated.
 *
 * TECHNICAL DEBT:
 * - No streaming. Responses are generated fully before sending.
 *   At Sprint 4, consider streaming for long responses (typing indicator).
 */

const BASE_SYSTEM = `You are a helpful, friendly sales assistant for a Nigerian business.
You communicate via Telegram/WhatsApp. Keep replies SHORT (2-4 sentences max).
Use warm, conversational Nigerian English. Occasionally use light Pidgin where natural.
Never make up product details - only use what you're given.
Format prices in Naira (e.g. ₦45,000 not 45000). Use emojis sparingly but warmly.`

const PIDGIN_SYSTEM = `You are a helpful, friendly sales assistant for a Nigerian business.
You communicate via Telegram/WhatsApp. Keep replies SHORT (2-4 sentences max).
The customer is speaking Nigerian Pidgin — reply in warm, natural Nigerian Pidgin English.
Examples of natural Pidgin: "E fine well well!", "Abeg add am for cart", "Na ₦45,000 e go cost you"
Never make up product details - only use what you're given.
Format prices in Naira (e.g. ₦45,000). Use emojis sparingly but warmly.`

/**
 * Builds the AI system prompt for a response.
 * If merchantContext is provided (from buildMerchantContext()), it is appended
 * so Claude uses correct terminology for this business type.
 */
function getSystemPrompt(language?: string, merchantContext?: string): string {
  const base = language === 'pcm' ? PIDGIN_SYSTEM : BASE_SYSTEM
  return merchantContext ? `${base}\n\nBUSINESS CONTEXT:\n${merchantContext}` : base
}

/** Formats price from kobo to Naira string */
export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`
}

/** Generate a warm product description for a customer inquiry */
export async function generateProductDescription(
  product: ProductSummary,
  customerQuestion: string,
  language?: string,
  merchantContext?: string,
): Promise<string> {
  const productContext = `
Product: ${product.name}
Price: ${formatNaira(product.priceKobo)}
Description: ${product.description ?? 'A quality fashion item'}
Available sizes: ${product.sizes.length > 0 ? product.sizes.join(', ') : 'One size'}
Available colors: ${product.colors.length > 0 ? product.colors.join(', ') : 'As shown'}
Category: ${product.category ?? 'Fashion'}`

  try {
    const response = await getAIClient().messages.create({
      model: AI_MODELS.responder,
      max_tokens: 200,
      system: getSystemPrompt(language, merchantContext),
      messages: [{
        role: 'user',
        content: `Customer asked: "${customerQuestion}"\n\nProduct details:\n${productContext}\n\nWrite a warm, helpful 2-3 sentence reply about this product. End with asking if they'd like to add it to their cart.`,
      }],
    })

    return response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : buildProductFallback(product)
  } catch (err) {
    logger.error({ err }, 'Product description generation failed - using fallback')
    return buildProductFallback(product)
  }
}

/**
 * Analyse a customer's photo and extract fashion search keywords.
 *
 * Accepts a base64-encoded image. Returns 2–4 keywords suitable for
 * feeding into searchProducts() (e.g. "ankara dress", "lace fabric").
 * Returns an empty string if Claude cannot identify a fashion item.
 */
export async function analyzeProductImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<string> {
  try {
    const response = await getAIClient().messages.create({
      model: AI_MODELS.responder,
      max_tokens: 60,
      system: BASE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text:
                'This customer wants to find a similar product in a Nigerian fashion store. ' +
                'Identify the clothing or fabric item shown and return 2–4 search keywords only ' +
                '(e.g. "ankara dress", "palazzo trousers", "lace agbada"). ' +
                'Return ONLY the keywords — no sentences, no punctuation.',
            },
          ],
        },
      ],
    })

    return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  } catch (err) {
    logger.error({ err }, 'Image analysis failed')
    return ''
  }
}

/** Generate a support reply for customer complaints or complex questions */
export async function generateSupportReply(customerMessage: string, language?: string, merchantContext?: string): Promise<string> {
  try {
    const response = await getAIClient().messages.create({
      model: AI_MODELS.responder,
      max_tokens: 150,
      system: getSystemPrompt(language, merchantContext),
      messages: [{
        role: 'user',
        content: `Customer support message: "${customerMessage}"\n\nWrite a warm, empathetic reply acknowledging their concern and letting them know a team member will follow up shortly.`,
      }],
    })

    return response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : "Thank you for reaching out! Our team will get back to you shortly. 🙏"
  } catch (err) {
    logger.error({ err }, 'Support reply generation failed')
    return "Thank you for reaching out! Our team will get back to you shortly. 🙏"
  }
}

function buildProductFallback(product: ProductSummary): string {
  const sizes = product.sizes.length > 0 ? `Sizes: ${product.sizes.join(', ')}` : ''
  const colors = product.colors.length > 0 ? `Colors: ${product.colors.join(', ')}` : ''
  const details = [sizes, colors].filter(Boolean).join(' | ')
  return `*${product.name}* — ${formatNaira(product.priceKobo)}\n${details}\n\nWould you like to add this to your cart?`
}
