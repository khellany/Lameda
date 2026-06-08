import { sendTextMessage, sendButtonsMessage, sendListMessage, resolveTelegramFileUrl } from '@/lib/telegram/client'
import { analyzeProductImage } from '@/lib/ai/respond'
import { searchProducts } from '@/lib/products/search'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Prompts the customer to send a photo.
 * Triggered by the "📸 Search by Photo" button in the main menu.
 * Sets phase to searching_by_image so the next media message is routed here.
 */
export async function handleSearchByPhoto(ctx: ConversationContext): Promise<HandlerResult> {
  const msg =
    `📸 Send me a photo of what you're looking for — a style you love, ` +
    `an outfit inspo, or a fabric pattern — and I'll find similar items in our store!`

  await sendTextMessage(ctx.botToken, ctx.chatId, msg)

  return {
    newState: { ...ctx.state, phase: 'searching_by_image' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

/**
 * Handles an image sent by the customer.
 *
 * Pipeline:
 * 1. Resolve Telegram file_id → download URL (via getFile API)
 * 2. Download image bytes → base64
 * 3. Ask Claude to extract fashion keywords from the image
 * 4. Search product catalog with those keywords
 * 5. Present matching products as a tappable list
 */
export async function handleImageReceived(
  ctx: ConversationContext,
  fileId: string,
): Promise<HandlerResult> {
  // Acknowledge right away — vision + search can take 2–4 seconds
  await sendTextMessage(ctx.botToken, ctx.chatId, '🔍 Analysing your photo, one sec...')

  // Step 1: Resolve file_id to a real download URL
  const fileUrl = await resolveTelegramFileUrl(ctx.botToken, fileId)

  if (!fileUrl) {
    const msg = "Sorry, I couldn't process that photo 😕 Could you try sending it again?"
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Step 2: Download image and encode as base64
  let imageBase64: string
  try {
    const imageRes = await fetch(fileUrl)
    const buffer = await imageRes.arrayBuffer()
    imageBase64 = Buffer.from(buffer).toString('base64')
  } catch (err) {
    logger.error({ err, fileId }, 'Failed to download Telegram image')
    const msg = "I had trouble downloading that image. Please try again! 😊"
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Step 3: Ask Claude to identify what the customer is looking for
  const keywords = await analyzeProductImage(imageBase64)

  if (!keywords) {
    const msg =
      "I can see the photo but couldn't identify a specific item 🤔\n\n" +
      "Try describing what you're looking for in text, or browse our full catalog!"
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse All Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  logger.info({ keywords, merchantId: ctx.merchantId }, 'Image analysed — searching catalog')

  // Step 4: Search catalog using extracted keywords
  const products = await searchProducts(ctx.merchantId, keywords)

  if (products.length === 0) {
    const msg =
      `I searched for *${keywords}* but we don't have an exact match right now 😕\n\n` +
      `Here's our full catalog — you might find something close!`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse All Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Step 5: Present matching products
  const intro =
    `✨ Found *${products.length}* item${products.length > 1 ? 's' : ''} similar to your photo:`

  await sendListMessage(
    ctx.botToken,
    ctx.chatId,
    intro,
    products.map(p => ({
      id: `product_${p.id}`,
      title: p.name,
      description: formatNaira(p.priceKobo),
    })),
  )

  const replySent =
    `${intro}\n` +
    products.map(p => `• ${p.name} — ${formatNaira(p.priceKobo)}`).join('\n')

  return {
    newState: { ...ctx.state, phase: 'browsing', lastQuery: keywords },
    newCart: ctx.cart,
    replySent,
  }
}
