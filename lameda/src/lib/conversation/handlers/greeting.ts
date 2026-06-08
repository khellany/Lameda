import { sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'
import type { BusinessType } from '@/lib/merchant/config'

/**
 * Greeting handler — first contact, /start, and return visits.
 *
 * Business-type-aware (STORY-022):
 *   - fashion/electronics/beauty: cart-enabled welcome, "Browse Products"
 *   - food: "Browse Menu", no size/color references
 *   - services: no cart, "View Services" + "Enquire Now" CTA
 *   - general: standard catalog language
 *
 * Personalises the welcome for returning customers:
 *   - Shows previous order count if any
 *   - Reminds them of cart items if they left without checking out
 */
export async function handleGreeting(ctx: ConversationContext): Promise<HandlerResult> {
  const supabase = createAdminClient()
  const config = ctx.merchantConfig
  const hasCart = config?.hasCart !== false  // true for all types except services
  const catalogLabel = config?.catalogLabel ?? 'catalog'
  const businessType: BusinessType = config?.businessType ?? 'general'

  // Check previous orders for this customer
  const { count: orderCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', ctx.customerId)
    .eq('merchant_id', ctx.merchantId)

  const isReturning = (orderCount ?? 0) > 0
  const hasCartItems = hasCart && ctx.cart.items.length > 0

  // ── Welcome text ──────────────────────────────────────────────────────────

  let welcomeText: string

  if (isReturning && hasCartItems) {
    const cartTotal = formatNaira(ctx.cart.totalKobo)
    welcomeText =
      `👋 Welcome back! Great to see you again.\n\n` +
      `🛒 You still have ${ctx.cart.items.length} item${ctx.cart.items.length > 1 ? 's' : ''} in your cart (*${cartTotal}*).\n\n` +
      `What would you like to do?`
  } else if (isReturning) {
    welcomeText =
      `👋 Welcome back! You've placed *${orderCount}* order${(orderCount ?? 0) > 1 ? 's' : ''} with us.\n\n` +
      `What would you like to do today?`
  } else if (hasCartItems) {
    welcomeText =
      `${welcomeEmoji(businessType)} Welcome! You have *${ctx.cart.items.length} item${ctx.cart.items.length > 1 ? 's' : ''}* waiting in your cart.\n\n` +
      `What would you like to do?`
  } else {
    welcomeText = buildFirstTimeWelcome(businessType, catalogLabel)
  }

  // ── Buttons ───────────────────────────────────────────────────────────────

  const catalogTitle = catalogLabel.charAt(0).toUpperCase() + catalogLabel.slice(1)

  // Primary browse button — label adapts to catalog type
  const browseBtn = { id: 'browse_all', title: `🛍 Browse ${catalogTitle}` }

  // Cart button — only shown when cart is enabled and has items
  const cartBtn = hasCart && hasCartItems
    ? { id: 'view_cart', title: `🛒 View Cart (${ctx.cart.items.length})` }
    : hasCart
      ? { id: 'view_cart', title: '🛒 View My Cart' }
      : null

  const buttons = [
    browseBtn,
    ...(businessType !== 'services' ? [{ id: 'search_by_photo', title: '📸 Search by Photo' }] : []),
    ...(cartBtn ? [cartBtn] : []),
    ...(isReturning && hasCart ? [{ id: 'order_status', title: '📦 My Orders' }] : []),
    { id: 'support', title: '💬 Get Help' },
  ]

  await sendButtonsMessage(ctx.botToken, ctx.chatId, welcomeText, buttons)

  return {
    newState: { ...ctx.state, phase: 'browsing' },
    newCart: ctx.cart,
    replySent: welcomeText,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function welcomeEmoji(businessType: BusinessType): string {
  const map: Record<BusinessType, string> = {
    fashion: '👗',
    food: '🍽️',
    electronics: '📱',
    beauty: '💅',
    services: '⭐',
    general: '🛍',
  }
  return map[businessType] ?? '🛍'
}

function buildFirstTimeWelcome(businessType: BusinessType, catalogLabel: string): string {
  const catalog = catalogLabel.charAt(0).toUpperCase() + catalogLabel.slice(1)

  switch (businessType) {
    case 'food':
      return (
        `🍽️ Welcome! Browse our menu and place your order right here on Telegram.\n\n` +
        `What would you like today?`
      )
    case 'services':
      return (
        `⭐ Welcome! I can walk you through our services and answer any questions.\n\n` +
        `How can I help you today?`
      )
    case 'beauty':
      return (
        `💅 Welcome! Explore our beauty products and find what works for you.\n\n` +
        `What would you like to do?`
      )
    case 'electronics':
      return (
        `📱 Welcome! Browse our ${catalog.toLowerCase()} to find the right device for you.\n\n` +
        `What would you like to do?`
      )
    default:
      // fashion + general
      return (
        `🛍 Welcome to our store! Browse our ${catalog.toLowerCase()} and find what you love.\n\n` +
        `What would you like to do?`
      )
  }
}
