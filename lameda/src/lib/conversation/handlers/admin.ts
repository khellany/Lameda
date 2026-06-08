/**
 * Admin command handlers for merchant Telegram bot management.
 *
 * Merchants register themselves as admin by sending:
 *   /register <api_key>
 * inside their own bot. Once registered, admin_telegram_chat_id is set
 * on their merchants row and subsequent slash commands are routed here.
 *
 * COMMANDS:
 *   /register <api_key>    — One-time admin registration
 *   /admin                 — Show help
 *   /listproducts [page]   — Paginated product list with stock
 *   /addproduct            — Multi-step guided product creation
 *   /updatestock           — Multi-step stock quantity update
 *   /orders [status]       — Recent orders summary
 *
 * Multi-step flows (/addproduct, /updatestock) persist state in
 * ConversationState.adminFlow. The webhook handler calls continueAdminFlow()
 * when state.phase === 'admin_flow' and the sender is the admin.
 *
 * Security note:
 *   - /register verifies the api_key belongs to THIS merchant's bot
 *   - All other commands require admin_telegram_chat_id === chatId
 *   - DB writes always include .eq('merchant_id', merchantId) to prevent
 *     cross-merchant data access
 */

import { sendTextMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'
import type { ConversationState, Cart, HandlerResult, AdminFlowState } from '../types'

// ── /register ──────────────────────────────────────────────────────────────

/**
 * Links the sender's Telegram chat ID as admin for this merchant's bot.
 * Available to anyone in the bot — the api_key is the authentication factor.
 * Once linked, subsequent slash commands are routed to admin handlers.
 */
export async function handleRegisterAdmin(
  text: string,
  chatId: string,
  botToken: string,
  merchantId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  const apiKey = text.replace(/^\/register\s*/i, '').trim()

  if (!apiKey.startsWith('lmd_')) {
    await sendTextMessage(
      botToken,
      chatId,
      `❌ Invalid API key format.\n\nYour key should start with "lmd_". Get it from your onboarding page or CRM dashboard.\n\nUsage: /register lmd_yourkey`,
    )
    return { newState: state, newCart: cart, replySent: 'Registration failed — invalid key format' }
  }

  const supabase = createAdminClient()

  // Verify the api_key belongs to THIS merchant's bot (path contains merchantId)
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, admin_telegram_chat_id')
    .eq('id', merchantId)
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle()

  if (!merchant) {
    await sendTextMessage(
      botToken,
      chatId,
      `❌ Registration failed.\n\nThat API key doesn't match this bot. Make sure you're using the key for *this* business.`,
    )
    return { newState: state, newCart: cart, replySent: 'Registration failed — key mismatch' }
  }

  if (merchant.admin_telegram_chat_id && merchant.admin_telegram_chat_id !== chatId) {
    await sendTextMessage(
      botToken,
      chatId,
      `⚠️ This bot already has a registered admin. Contact support if you need to change it.`,
    )
    return { newState: state, newCart: cart, replySent: 'Registration blocked — admin already set' }
  }

  await supabase
    .from('merchants')
    .update({ admin_telegram_chat_id: chatId })
    .eq('id', merchantId)

  logger.info({ merchantId, chatId }, 'Admin Telegram account registered')

  await sendTextMessage(
    botToken,
    chatId,
    `✅ You're registered as admin for *${merchant.business_name}*!\n\nSend /admin to see available commands.`,
  )

  return { newState: state, newCart: cart, replySent: 'Admin registration successful' }
}

// ── /admin help ────────────────────────────────────────────────────────────

export async function handleAdminHelp(
  botToken: string,
  chatId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  const msg =
    `🛠 *Admin Commands*\n\n` +
    `/listproducts — View all products with stock levels\n` +
    `/listproducts 2 — Page 2\n` +
    `/addproduct — Add a new product (guided)\n` +
    `/updatestock — Update stock for a product\n` +
    `/orders — View recent orders\n` +
    `/orders pending — Filter by status\n\n` +
    `_Status options: pending, confirmed, paid, shipped, delivered, cancelled_\n\n` +
    `Send "cancel" at any time to exit a multi-step flow.`

  await sendTextMessage(botToken, chatId, msg)
  return { newState: state, newCart: cart, replySent: msg }
}

// ── /listproducts ──────────────────────────────────────────────────────────

export async function handleListProducts(
  args: string[],
  botToken: string,
  chatId: string,
  merchantId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  const page = Math.max(1, parseInt(args[0] ?? '1', 10))
  const limit = 10
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  const { data: products, count } = await supabase
    .from('products')
    .select('id, name, price_kobo, stock_count, is_active, category', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('name')
    .range(offset, offset + limit - 1)

  if (!products || products.length === 0) {
    const msg = page > 1
      ? `No more products on page ${page}.`
      : `No products found. Use /addproduct to add your first product.`
    await sendTextMessage(botToken, chatId, msg)
    return { newState: state, newCart: cart, replySent: msg }
  }

  const totalPages = Math.ceil((count ?? 0) / limit)

  const lines = products.map((p, i) => {
    const stock = p.stock_count === null ? '∞' : p.stock_count === 0 ? '❌ Out' : `${p.stock_count}`
    const status = p.is_active ? '✅' : '🔴'
    const cat = p.category ? ` | ${p.category}` : ''
    return (
      `${status} ${offset + i + 1}. *${p.name}*\n` +
      `   ${formatNaira(p.price_kobo)} | Stock: ${stock}${cat}`
    )
  })

  const header = `📦 *Products* (page ${page}/${totalPages}, ${count ?? 0} total)\n\n`
  const footer = totalPages > page ? `\n\nSend /listproducts ${page + 1} for next page.` : ''
  const msg = header + lines.join('\n\n') + footer

  await sendTextMessage(botToken, chatId, msg)
  return { newState: state, newCart: cart, replySent: `Listed ${products.length} products` }
}

// ── /orders ────────────────────────────────────────────────────────────────

const STATUS_EMOJI: Record<string, string> = {
  pending: '⏳', confirmed: '✅', paid: '💳',
  shipped: '🚚', delivered: '📦', cancelled: '❌',
}

const VALID_ORDER_STATUSES = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled']

export async function handleOrdersSummary(
  args: string[],
  botToken: string,
  chatId: string,
  merchantId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  const statusFilter = args[0] && VALID_ORDER_STATUSES.includes(args[0]) ? args[0] : null

  const supabase = createAdminClient()

  type CustomerJoin = { phone_number: string; display_name: string | null } | null

  let query = supabase
    .from('orders')
    .select(
      'id, reference, status, total_kobo, created_at, customers!inner(phone_number, display_name)',
      { count: 'exact' },
    )
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (statusFilter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.eq('status', statusFilter as any)
  }

  const { data: orders, count } = await query

  if (!orders || orders.length === 0) {
    const msg = statusFilter
      ? `No ${statusFilter} orders found.`
      : `No orders yet. Share your bot link to start receiving orders!`
    await sendTextMessage(botToken, chatId, msg)
    return { newState: state, newCart: cart, replySent: msg }
  }

  const lines = orders.map(o => {
    const customer = o.customers as unknown as CustomerJoin
    const emoji = STATUS_EMOJI[o.status] ?? '•'
    const name = customer?.display_name ?? customer?.phone_number ?? 'Customer'
    const date = new Date(o.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })
    return `${emoji} *${o.reference}* — ${formatNaira(o.total_kobo)}\n   ${name} | ${date} | ${o.status}`
  })

  const title = statusFilter
    ? `📋 *${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Orders* (${count ?? 0} total)`
    : `📋 *Recent Orders* (${count ?? 0} total)`

  const msg = title + '\n\n' + lines.join('\n\n')
  await sendTextMessage(botToken, chatId, msg)
  return { newState: state, newCart: cart, replySent: `Showed ${orders.length} orders` }
}

// ── /addproduct (multi-step flow) ──────────────────────────────────────────

export async function startAddProduct(
  botToken: string,
  chatId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  await sendTextMessage(botToken, chatId,
    `➕ *Add New Product* (5 steps)\n\nStep 1/5: What's the product name?\n\n_Send "cancel" at any time to quit._`)

  return {
    newState: {
      ...state,
      phase: 'admin_flow',
      adminFlow: { step: 'awaiting_product_name', data: {} },
    },
    newCart: cart,
    replySent: 'Started /addproduct flow',
  }
}

// ── /updatestock (multi-step flow) ─────────────────────────────────────────

export async function startUpdateStock(
  botToken: string,
  chatId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  await sendTextMessage(botToken, chatId,
    `📦 *Update Stock*\n\nWhich product? Type part of the name to search:\n\n_Send "cancel" to quit._`)

  return {
    newState: {
      ...state,
      phase: 'admin_flow',
      adminFlow: { step: 'awaiting_stock_product', data: {} },
    },
    newCart: cart,
    replySent: 'Started /updatestock flow',
  }
}

// ── Admin flow continuation ─────────────────────────────────────────────────

/**
 * Called when the admin sends a plain message while phase === 'admin_flow'.
 * Routes to the correct step handler based on adminFlow.step.
 */
export async function continueAdminFlow(
  text: string,
  chatId: string,
  botToken: string,
  merchantId: string,
  state: ConversationState,
  cart: Cart,
): Promise<HandlerResult> {
  const flow = state.adminFlow
  if (!flow) return handleAdminHelp(botToken, chatId, state, cart)

  // Allow cancelling from any step
  if (text.trim().toLowerCase() === 'cancel' || text.trim() === '/cancel') {
    await sendTextMessage(botToken, chatId, `❌ Cancelled. Send /admin for available commands.`)
    return {
      newState: { ...state, phase: 'greeting', adminFlow: undefined },
      newCart: cart,
      replySent: 'Admin flow cancelled',
    }
  }

  switch (flow.step) {
    case 'awaiting_product_name':        return stepProductName(text, chatId, botToken, state, cart, flow)
    case 'awaiting_product_price':       return stepProductPrice(text, chatId, botToken, state, cart, flow)
    case 'awaiting_product_category':    return stepProductCategory(text, chatId, botToken, state, cart, flow)
    case 'awaiting_product_description': return stepProductDescription(text, chatId, botToken, state, cart, flow)
    case 'awaiting_product_stock':       return stepProductStock(text, chatId, botToken, merchantId, state, cart, flow)
    case 'awaiting_stock_product':       return stepStockProductSearch(text, chatId, botToken, merchantId, state, cart, flow)
    case 'awaiting_stock_quantity':      return stepStockQuantity(text, chatId, botToken, merchantId, state, cart, flow)
    default:
      return handleAdminHelp(botToken, chatId, state, cart)
  }
}

// ── /addproduct steps ───────────────────────────────────────────────────────

async function stepProductName(
  text: string, chatId: string, botToken: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const name = text.trim()
  if (name.length < 2) {
    await sendTextMessage(botToken, chatId, `Product name must be at least 2 characters. Try again:`)
    return { newState: state, newCart: cart, replySent: 'Validation — name too short' }
  }
  await sendTextMessage(botToken, chatId,
    `Step 2/5: Price in Naira?\n(Numbers only — e.g. "5000" for ₦5,000)`)
  return {
    newState: { ...state, adminFlow: { step: 'awaiting_product_price', data: { ...flow.data, name } } },
    newCart: cart,
    replySent: `Name captured: ${name}`,
  }
}

async function stepProductPrice(
  text: string, chatId: string, botToken: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const priceNaira = parseInt(text.replace(/[^0-9]/g, ''), 10)
  if (isNaN(priceNaira) || priceNaira <= 0) {
    await sendTextMessage(botToken, chatId,
      `Please enter a valid price in Naira (numbers only).\nE.g. "5000" for ₦5,000:`)
    return { newState: state, newCart: cart, replySent: 'Validation — invalid price' }
  }
  const priceKobo = priceNaira * 100
  await sendTextMessage(botToken, chatId,
    `Step 3/5: Category?\n(e.g. "T-shirts", "Dresses") or type "skip":`)
  return {
    newState: { ...state, adminFlow: { step: 'awaiting_product_category', data: { ...flow.data, priceKobo } } },
    newCart: cart,
    replySent: `Price captured: ₦${priceNaira}`,
  }
}

async function stepProductCategory(
  text: string, chatId: string, botToken: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const category = text.trim().toLowerCase() === 'skip' ? '' : text.trim()
  await sendTextMessage(botToken, chatId,
    `Step 4/5: Short description? or type "skip":`)
  return {
    newState: { ...state, adminFlow: { step: 'awaiting_product_description', data: { ...flow.data, category } } },
    newCart: cart,
    replySent: 'Category captured',
  }
}

async function stepProductDescription(
  text: string, chatId: string, botToken: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const description = text.trim().toLowerCase() === 'skip' ? '' : text.trim()
  await sendTextMessage(botToken, chatId,
    `Step 5/5: Initial stock quantity?\n(Enter a number or type "unlimited"):`)
  return {
    newState: { ...state, adminFlow: { step: 'awaiting_product_stock', data: { ...flow.data, description } } },
    newCart: cart,
    replySent: 'Description captured',
  }
}

async function stepProductStock(
  text: string, chatId: string, botToken: string, merchantId: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const supabase = createAdminClient()

  let stockCount: number | null = null
  if (text.trim().toLowerCase() !== 'unlimited') {
    stockCount = parseInt(text.replace(/[^0-9]/g, ''), 10)
    if (isNaN(stockCount) || stockCount < 0) {
      await sendTextMessage(botToken, chatId, `Please enter a valid number or "unlimited":`)
      return { newState: state, newCart: cart, replySent: 'Validation — invalid stock' }
    }
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      merchant_id: merchantId,
      name: String(flow.data.name),
      price_kobo: Number(flow.data.priceKobo),
      category: flow.data.category ? String(flow.data.category) : null,
      description: flow.data.description ? String(flow.data.description) : null,
      stock_count: stockCount,
      is_active: true,
      image_url: null,
    })
    .select('id, name')
    .single()

  if (error || !product) {
    logger.error({ merchantId, err: error?.message }, 'Product insert failed via /addproduct')
    await sendTextMessage(botToken, chatId, `❌ Failed to create product. Please try again with /addproduct.`)
    return {
      newState: { ...state, phase: 'greeting', adminFlow: undefined },
      newCart: cart,
      replySent: 'Product creation failed',
    }
  }

  const stockDisplay = stockCount === null ? 'unlimited' : `${stockCount} units`
  await sendTextMessage(
    botToken,
    chatId,
    `✅ *Product created!*\n\n*${product.name}*\n${formatNaira(Number(flow.data.priceKobo))} | Stock: ${stockDisplay}\n\nSend /listproducts to see all products.`,
  )

  logger.info({ merchantId, productId: product.id, name: product.name }, 'Product created via admin command')

  return {
    newState: { ...state, phase: 'greeting', adminFlow: undefined },
    newCart: cart,
    replySent: `Product created: ${product.name}`,
  }
}

// ── /updatestock steps ──────────────────────────────────────────────────────

async function stepStockProductSearch(
  text: string, chatId: string, botToken: string, merchantId: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock_count')
    .eq('merchant_id', merchantId)
    .ilike('name', `%${text.trim()}%`)
    .limit(5)

  if (!products || products.length === 0) {
    await sendTextMessage(botToken, chatId,
      `No products found matching "${text}". Try a different name:`)
    return { newState: state, newCart: cart, replySent: 'No products matched search' }
  }

  if (products.length === 1) {
    const p = products[0]
    const currentStock = p.stock_count === null ? 'unlimited' : `${p.stock_count}`
    await sendTextMessage(botToken, chatId,
      `Found: *${p.name}*\nCurrent stock: ${currentStock}\n\nNew stock quantity? (number or "unlimited"):`)
    return {
      newState: {
        ...state,
        adminFlow: { step: 'awaiting_stock_quantity', data: { productId: p.id, productName: p.name } },
      },
      newCart: cart,
      replySent: `Matched product: ${p.name}`,
    }
  }

  // Multiple matches — ask for a more specific name
  const list = products
    .map((p, i) => {
      const stock = p.stock_count === null ? '∞' : p.stock_count
      return `${i + 1}. ${p.name} (stock: ${stock})`
    })
    .join('\n')

  await sendTextMessage(botToken, chatId,
    `Multiple matches found:\n\n${list}\n\nType the exact product name:`)
  return { newState: state, newCart: cart, replySent: 'Multiple product matches' }
}

async function stepStockQuantity(
  text: string, chatId: string, botToken: string, merchantId: string,
  state: ConversationState, cart: Cart, flow: AdminFlowState,
): Promise<HandlerResult> {
  const supabase = createAdminClient()

  let newStock: number | null = null
  if (text.trim().toLowerCase() !== 'unlimited') {
    newStock = parseInt(text.replace(/[^0-9]/g, ''), 10)
    if (isNaN(newStock) || newStock < 0) {
      await sendTextMessage(botToken, chatId, `Please enter a valid number or "unlimited":`)
      return { newState: state, newCart: cart, replySent: 'Validation — invalid stock' }
    }
  }

  const productId = String(flow.data.productId)
  const productName = String(flow.data.productName)

  const { error } = await supabase
    .from('products')
    .update({ stock_count: newStock })
    .eq('id', productId)
    .eq('merchant_id', merchantId) // prevent cross-merchant update

  if (error) {
    logger.error({ merchantId, productId, err: error.message }, 'Stock update failed via admin command')
    await sendTextMessage(botToken, chatId, `❌ Failed to update stock. Please try again with /updatestock.`)
    return {
      newState: { ...state, phase: 'greeting', adminFlow: undefined },
      newCart: cart,
      replySent: 'Stock update failed',
    }
  }

  const displayStock = newStock === null ? 'unlimited' : `${newStock} units`
  await sendTextMessage(botToken, chatId,
    `✅ Stock updated!\n\n*${productName}*\nNew stock: ${displayStock}`)

  logger.info({ merchantId, productId, newStock }, 'Stock updated via admin command')

  return {
    newState: { ...state, phase: 'greeting', adminFlow: undefined },
    newCart: cart,
    replySent: `Stock updated — ${productName}: ${displayStock}`,
  }
}
