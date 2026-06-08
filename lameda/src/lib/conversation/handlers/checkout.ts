import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import { initializeTransaction } from '@/lib/payments/paystack'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Checkout handler — full flow:
 * 1. Empty cart guard
 * 2. Delivery vs pickup choice
 * 3a. If delivery: collect address → match delivery zone → fee shown in summary
 * 3b. If pickup:   show pickup address
 * 4. Order summary + confirm
 * 5. Create order + Paystack link
 */

// ----------------------------------------------------------------
// Step 1: Start checkout — ask delivery or pickup
// ----------------------------------------------------------------

export async function handleCheckoutStart(ctx: ConversationContext): Promise<HandlerResult> {
  if (ctx.cart.items.length === 0) {
    const msg = `Your cart is empty! Add some items before checking out. 🛍`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Check if merchant has a pickup address configured
  const supabase = createAdminClient()
  const { data: merchant } = await supabase
    .from('merchants')
    .select('pickup_address, default_delivery_fee_kobo')
    .eq('id', ctx.merchantId)
    .single()

  const hasPickup = !!merchant?.pickup_address

  // Delivery-only: confirm delivery is selected and immediately ask for address.
  // Going straight to collecting_address ensures pendingDeliveryMethod is set
  // before handleAddressReceived runs, preventing the delivery-method-missing bug.
  if (!hasPickup) {
    const deliveryMsg =
      `🏍 *Delivery selected.*\n\n` +
      `📍 Please send your delivery address.\n\n` +
      `Format: house number, street, area, city, and state.\n` +
      `_Example: 12 Adeniyi Jones, Ikeja, Lagos_`
    await sendTextMessage(ctx.botToken, ctx.chatId, deliveryMsg)
    return {
      newState: { ...ctx.state, phase: 'collecting_address', pendingDeliveryMethod: 'delivery' },
      newCart: ctx.cart,
      replySent: deliveryMsg,
    }
  }

  const msg = `📦 How would you like to receive your order?`
  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'delivery_choice_delivery', title: '🏍 Delivery' },
    { id: 'delivery_choice_pickup', title: '🏪 Pickup' },
  ])

  return {
    newState: { ...ctx.state, phase: 'selecting_delivery' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

// ----------------------------------------------------------------
// Step 2a: Delivery chosen — ask for address
// ----------------------------------------------------------------

export async function handleDeliveryChosen(ctx: ConversationContext): Promise<HandlerResult> {
  const msg =
    `📍 Please send your *delivery address*.\n\n` +
    `Format: house number, street, area, city, and state.\n` +
    `_Example: 12 Adeniyi Jones, Ikeja, Lagos_`

  await sendTextMessage(ctx.botToken, ctx.chatId, msg)

  return {
    newState: { ...ctx.state, phase: 'collecting_address', pendingDeliveryMethod: 'delivery' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

// ----------------------------------------------------------------
// Step 2b: Pickup chosen — show location and skip to confirmation
// ----------------------------------------------------------------

export async function handlePickupChosen(ctx: ConversationContext): Promise<HandlerResult> {
  const supabase = createAdminClient()
  const { data: merchant } = await supabase
    .from('merchants')
    .select('pickup_address')
    .eq('id', ctx.merchantId)
    .single()

  const pickupAddress = merchant?.pickup_address ?? 'Contact us for pickup location'

  const lines = ctx.cart.items.map(
    (item, i) => `${i + 1}. ${item.name} ×${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `📋 *Order Summary*\n\n` +
    `${lines.join('\n')}\n\n` +
    `🏪 Pickup at: _${pickupAddress}_\n` +
    `🚚 Delivery fee: *Free (Pickup)*\n` +
    `💰 *Total: ${formatNaira(ctx.cart.totalKobo)}*\n\n` +
    `Ready to confirm?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ])

  return {
    newState: {
      ...ctx.state,
      phase: 'confirming_order',
      pendingDeliveryMethod: 'pickup',
      pendingAddress: pickupAddress,
    },
    newCart: ctx.cart,
    replySent: summary,
  }
}

// ----------------------------------------------------------------
// Step 3: Address received — match zone and show summary
// ----------------------------------------------------------------

export async function handleAddressReceived(ctx: ConversationContext): Promise<HandlerResult> {
  const address = ctx.intent.entities.address ?? ctx.rawMessage.trim()

  // Basic address validation
  const validation = validateAddress(address)
  if (!validation.ok) {
    const msg =
      `⚠️ That address looks incomplete.\n\n` +
      `Please include your house number, street, area, city, and state.\n` +
      `_Example: 12 Adeniyi Jones, Ikeja, Lagos_`
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  // Reject addresses with no recognizable Nigerian location
  if (!isNigerianAddress(address)) {
    const msg =
      `⚠️ We couldn't find a Nigerian city or state in that address.\n\n` +
      `Please include your city and state — e.g. *Warri, Delta* or *Lekki, Lagos*.\n` +
      `_We currently deliver within Nigeria only._`
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  // Detect delivery state — prioritise state over city
  const deliveryState = extractStateFromAddress(address)
  const isLagos = !deliveryState || deliveryState.toLowerCase() === 'lagos'

  // Outside Lagos — ask customer to choose a logistics partner
  if (!isLagos) {
    const stateName = capitaliseFirst(deliveryState ?? 'your state')
    const logisticsMsg =
      `📦 We deliver to *${stateName}*!\n\n` +
      `Please choose your preferred shipping method:`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, logisticsMsg, [
      { id: 'logistics_gig', title: '🚐 GIG Logistics' },
      { id: 'logistics_park_waybill', title: '📦 Park Waybill' },
    ])
    return {
      newState: {
        ...ctx.state,
        phase: 'selecting_logistics',
        pendingAddress: address,
        pendingDeliveryMethod: 'delivery',
      },
      newCart: ctx.cart,
      replySent: logisticsMsg,
    }
  }

  // Lagos — resolve zone-based delivery fee and show order summary
  const deliveryFeeKobo = await resolveDeliveryFee(ctx.merchantId, address)
  const totalWithDelivery = ctx.cart.totalKobo + deliveryFeeKobo

  const lines = ctx.cart.items.map(
    (item, i) => `${i + 1}. ${item.name}${item.size ? ` (${item.size})` : ''} ×${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `📋 *Order Summary*\n\n` +
    `${lines.join('\n')}\n\n` +
    `📍 Delivery to: _${address}_\n` +
    `🚚 Delivery fee: *${deliveryFeeKobo === 0 ? 'Free' : formatNaira(deliveryFeeKobo)}*\n` +
    `💰 *Total: ${formatNaira(totalWithDelivery)}*\n\n` +
    `Ready to confirm?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ])

  return {
    newState: {
      ...ctx.state,
      phase: 'confirming_order',
      pendingAddress: address,
      pendingDeliveryMethod: 'delivery',
    },
    newCart: { ...ctx.cart, deliveryFeeKobo, totalKobo: totalWithDelivery } as typeof ctx.cart,
    replySent: summary,
  }
}

// ----------------------------------------------------------------
// Step 3b: Logistics chosen (outside Lagos) — show order summary
// ----------------------------------------------------------------

export async function handleLogisticsSelected(
  ctx: ConversationContext,
  logisticsType: 'gig' | 'park_waybill',
): Promise<HandlerResult> {
  const address = ctx.state.pendingAddress ?? ''

  // For interstate deliveries we MUST NOT use zone-based fee lookup.
  // Zone keywords are Lagos-scoped (Ikeja, Lekki, VI, etc.) so an address like
  // "12 Allen Avenue, Ikeja, Delta" would incorrectly match the Ikeja Lagos zone.
  // Use the merchant's flat default fee instead — it is intended for non-Lagos orders.
  const supabase = createAdminClient()
  const { data: merchant } = await supabase
    .from('merchants')
    .select('default_delivery_fee_kobo')
    .eq('id', ctx.merchantId)
    .single()
  const deliveryFeeKobo = merchant?.default_delivery_fee_kobo ?? 0

  const totalWithDelivery = ctx.cart.totalKobo + deliveryFeeKobo

  const logisticsName = logisticsType === 'gig' ? 'GIG Logistics' : 'Park Waybill'

  const lines = ctx.cart.items.map(
    (item, i) => `${i + 1}. ${item.name}${item.size ? ` (${item.size})` : ''} ×${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `📋 *Order Summary*\n\n` +
    `${lines.join('\n')}\n\n` +
    `📍 Ship to: _${address}_\n` +
    `🚚 Shipping via: *${logisticsName}*\n` +
    `📦 Delivery fee: *${deliveryFeeKobo === 0 ? 'Free' : formatNaira(deliveryFeeKobo)}*\n` +
    `💰 *Total: ${formatNaira(totalWithDelivery)}*\n\n` +
    `Ready to confirm?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ])

  return {
    newState: {
      ...ctx.state,
      phase: 'confirming_order',
      pendingLogisticsType: logisticsType,
      pendingDeliveryMethod: 'delivery',
    },
    newCart: { ...ctx.cart, deliveryFeeKobo, totalKobo: totalWithDelivery } as typeof ctx.cart,
    replySent: summary,
  }
}

// ----------------------------------------------------------------
// Step 4: Confirm order → create DB record + Paystack link
// ----------------------------------------------------------------

export async function handleConfirmOrder(ctx: ConversationContext): Promise<HandlerResult> {
  const address = ctx.state.pendingAddress ?? 'Not provided'
  const deliveryMethod = ctx.state.pendingDeliveryMethod ?? 'delivery'
  const logisticsType = ctx.state.pendingLogisticsType   // set only for outside-Lagos orders
  const supabase = createAdminClient()

  const ref = `LMD-${Date.now().toString(36).toUpperCase()}`

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        merchant_id: ctx.merchantId,
        customer_id: ctx.customerId,
        conversation_id: ctx.conversationId,
        status: 'confirmed',
        line_items: ctx.cart.items as unknown as import('@/types/database').Json,
        subtotal_kobo: ctx.cart.items.reduce((s, i) => s + i.priceKobo * i.quantity, 0),
        delivery_fee_kobo: (ctx.cart as unknown as Record<string, number>).deliveryFeeKobo ?? 0,
        total_kobo: ctx.cart.totalKobo,
        delivery_address: address,
        delivery_method: deliveryMethod,
        reference: ref,
      })
      .select('id, reference')
      .single()

    if (error || !order) throw new Error(error?.message ?? 'Order insert failed')

    const isMockMode = process.env.PAYMENT_MOCK === 'true'

    // ── MOCK PAYMENT MODE ─────────────────────────────────────────
    // Set PAYMENT_MOCK=true in Vercel env vars to bypass Paystack for
    // prototype testing. Orders are marked 'paid' immediately.
    // Remove this env var and add PAYSTACK_SECRET_KEY before go-live.
    // ─────────────────────────────────────────────────────────────
    if (isMockMode) {
      await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)
      await supabase.from('payments').insert({
        order_id: order.id,
        merchant_id: ctx.merchantId,
        status: 'success',
        amount_kobo: ctx.cart.totalKobo,
        currency: 'NGN',
        paystack_reference: `MOCK-${ref}`,
        paystack_access_code: 'mock',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { mock: true },
      })

      const logisticsNote =
        logisticsType === 'park_waybill'
          ? `\n\n📦 *Park Waybill:* A representative will reach out to confirm your delivery details.`
          : logisticsType === 'gig'
            ? `\n\n🚐 *GIG Logistics:* Your order tracking ID and delivery details will be communicated to you.`
            : ''

      const mockMsg =
        `🎉 *Order Confirmed!* _(Test Mode)_\n\n` +
        `Reference: \`${order.reference}\`\n` +
        `Total: *${formatNaira(ctx.cart.totalKobo)}*\n\n` +
        `🔧 _Payment bypassed for prototype testing. Payment integration will be active at launch._` +
        logisticsNote

      await sendTextMessage(ctx.botToken, ctx.chatId, mockMsg)

      // In mock mode, payment is instant — show follow-up immediately
      const mockFollowUp = `Is there anything else you'd like to order? 😊`
      await sendButtonsMessage(ctx.botToken, ctx.chatId, mockFollowUp, [
        { id: 'browse_all', title: '🛍 Shop More' },
        { id: 'session_done', title: '✅ That\'s All' },
      ])

      logger.info({ orderId: order.id, ref: order.reference, mock: true }, 'Order confirmed (mock mode)')

      return {
        newState: {
          ...ctx.state,
          phase: 'completed',
          activeOrderId: order.id,
          pendingAddress: undefined,
          pendingDeliveryMethod: undefined,
          pendingLogisticsType: undefined,
        },
        newCart: { items: [], totalKobo: 0 },
        replySent: mockMsg,
      }
    }

    // ── LIVE PAYMENT MODE ─────────────────────────────────────────
    const syntheticEmail = `${ctx.customerId}@telegram.lameda.bot`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lameda.vercel.app'
    const linkExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const paystackResult = await initializeTransaction({
      amountKobo: ctx.cart.totalKobo,
      email: syntheticEmail,
      reference: ref,
      callbackUrl: `${appUrl}/payment/callback`,
      metadata: {
        order_id: order.id,
        customer_id: ctx.customerId,
        merchant_id: ctx.merchantId,
        conversation_id: ctx.conversationId,
      },
    })

    if (paystackResult) {
      await supabase.from('payments').insert({
        order_id: order.id,
        merchant_id: ctx.merchantId,
        status: 'pending',
        amount_kobo: ctx.cart.totalKobo,
        currency: 'NGN',
        paystack_reference: paystackResult.reference,
        paystack_access_code: paystackResult.access_code,
        expires_at: linkExpiry,
        metadata: { synthetic_email: syntheticEmail },
      })
    }

    if (!paystackResult) {
      // Paystack failed — order is created in DB but payment link couldn't be generated.
      // Keep phase at confirming_order so the customer can retry; don't clear the cart.
      logger.error({ orderId: order.id, ref: order.reference }, 'Paystack init failed — order held for retry')
      const retryMsg =
        `✅ *Order received!* Reference: \`${order.reference}\`\n\n` +
        `💳 We couldn't generate your payment link right now.\n` +
        `Please tap *Retry Payment* or contact us with your reference number.`
      await sendButtonsMessage(ctx.botToken, ctx.chatId, retryMsg, [
        { id: 'confirm_order', title: '🔄 Retry Payment' },
        { id: 'cancel_order', title: '❌ Cancel Order' },
      ])
      return { newState: ctx.state, newCart: ctx.cart, replySent: retryMsg }
    }

    // Logistics-specific follow-up note (only for outside-Lagos orders)
    const logisticsNote =
      logisticsType === 'park_waybill'
        ? `\n\n📦 *Park Waybill:* A representative will reach out to confirm your delivery details.`
        : logisticsType === 'gig'
          ? `\n\n🚐 *GIG Logistics:* Your order tracking ID and delivery details will be communicated to you.`
          : ''

    const confirmMsg =
      `🎉 *Order Confirmed!*\n\n` +
      `Reference: \`${order.reference}\`\n` +
      `Total: *${formatNaira(ctx.cart.totalKobo)}*\n\n` +
      `💳 *Pay securely here:*\n${paystackResult.authorization_url}\n\n` +
      `_Link expires in 30 minutes._` +
      logisticsNote

    await sendTextMessage(ctx.botToken, ctx.chatId, confirmMsg)

    // Phase moves to payment_pending — the Paystack webhook will send
    // the "Is there anything else?" follow-up after payment is confirmed.
    logger.info({ orderId: order.id, ref: order.reference, merchantId: ctx.merchantId }, 'Order confirmed — awaiting payment')

    return {
      newState: {
        ...ctx.state,
        phase: 'payment_pending',
        activeOrderId: order.id,
        pendingAddress: undefined,
        pendingDeliveryMethod: undefined,
        pendingLogisticsType: undefined,
      },
      newCart: { items: [], totalKobo: 0 },
      replySent: confirmMsg,
    }
  } catch (err) {
    logger.error({ err }, 'Order creation failed')
    const errMsg = `Something went wrong creating your order. Please try again or contact us directly. 😕`
    await sendTextMessage(ctx.botToken, ctx.chatId, errMsg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: errMsg }
  }
}

export async function handleCancelOrder(ctx: ConversationContext): Promise<HandlerResult> {
  const msg = `Order cancelled. Your cart is still saved if you want to try again! 🛒`
  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
  ])
  return { newState: { ...ctx.state, phase: 'cart_review' }, newCart: ctx.cart, replySent: msg }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Resolves delivery fee by matching address keywords against merchant delivery zones.
 * Falls back to merchant default fee if no zone matches.
 */
async function resolveDeliveryFee(merchantId: string, address: string): Promise<number> {
  const supabase = createAdminClient()
  const lower = address.toLowerCase()

  const { data: zones } = await supabase
    .from('merchant_delivery_zones')
    .select('zone_name, keywords, fee_kobo, is_default')
    .eq('merchant_id', merchantId)
    .order('sort_order')

  if (!zones || zones.length === 0) {
    // Fall back to merchant default fee
    const { data: merchant } = await supabase
      .from('merchants')
      .select('default_delivery_fee_kobo')
      .eq('id', merchantId)
      .single()
    return merchant?.default_delivery_fee_kobo ?? 0
  }

  // Try to match a specific zone first
  for (const zone of zones) {
    if (!zone.is_default && zone.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return zone.fee_kobo
    }
  }

  // Fall back to default zone
  const defaultZone = zones.find(z => z.is_default)
  return defaultZone?.fee_kobo ?? 0
}

/** Simple Nigerian address validation — checks minimum length and word count */
function validateAddress(address: string): { ok: boolean } {
  const trimmed = address.trim()
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (trimmed.length < 10 || wordCount < 3) return { ok: false }
  return { ok: true }
}

/**
 * Comprehensive Nigeria location dictionary.
 * Keys are state names (lower-case). Values are arrays of major cities/LGAs.
 * Used to: (a) detect state from address, (b) confirm the address is in Nigeria.
 */
const NIGERIA_LOCATIONS: Record<string, string[]> = {
  'lagos': ['ikeja', 'lekki', 'victoria island', 'ikoyi', 'surulere', 'yaba', 'mushin', 'oshodi',
    'agege', 'alimosho', 'badagry', 'epe', 'ibeju-lekki', 'ifako-ijaiye', 'ikorodu', 'kosofe',
    'lagos island', 'lagos mainland', 'shomolu', 'apapa', 'ajah', 'festac', 'amuwo-odofin',
    'gbagada', 'magodo', 'ojota', 'sangotedo', 'awoyaya'],
  'abuja': ['garki', 'wuse', 'maitama', 'asokoro', 'gwarinpa', 'kubwa', 'nyanya', 'karu',
    'lugbe', 'gwagwalada', 'bwari', 'abaji', 'kuje', 'kwali', 'jabi', 'wuye', 'utako'],
  'fct': ['garki', 'wuse', 'maitama', 'asokoro', 'gwarinpa', 'kubwa', 'nyanya', 'karu', 'lugbe'],
  'rivers': ['port harcourt', 'bonny', 'obio-akpor', 'okrika', 'eleme', 'oyigbo', 'rumuola',
    'rumuokoro', 'rumuola', 'rumuigbo', 'diobu', 'trans-amadi', 'mile 1', 'mile 3'],
  'oyo': ['ibadan', 'ogbomoso', 'iseyin', 'saki', 'eruwa', 'lanlate', 'igboho',
    'mokola', 'bodija', 'dugbe', 'ojoo'],
  'kano': ['kano city', 'nassarawa', 'ungogo', 'fagge', 'dala', 'gwale', 'kumbotso',
    'tarauni', 'doguwa', 'bichi', 'gwarzo', 'sumaila', 'dawakin tofa', 'tofa'],
  'delta': ['warri', 'asaba', 'sapele', 'ughelli', 'agbor', 'ozoro', 'abraka', 'oleh',
    'kwale', 'burutu', 'bomadi', 'eku', 'effurun', 'uvwie', 'okpe'],
  'anambra': ['awka', 'onitsha', 'nnewi', 'ekwulobia', 'aguata', 'ihiala', 'ogidi',
    'obosi', 'nkpor', 'awka-etiti', 'dunukofia'],
  'edo': ['benin city', 'ekpoma', 'auchi', 'uromi', 'igarra', 'otuo', 'fugar',
    'ubiaja', 'illushi', 'sabongida-ora', 'etsako'],
  'enugu': ['enugu', 'nsukka', 'agbani', 'oji river', 'awgu', 'udi', 'ezeagu', 'igbo-eze'],
  'imo': ['owerri', 'orlu', 'okigwe', 'mbaise', 'mbano', 'onuimo', 'oru east', 'oru west'],
  'abia': ['umuahia', 'aba', 'arochukwu', 'ohafia', 'bende', 'ikwuano', 'isuikwuato'],
  'adamawa': ['yola', 'mubi', 'jimeta', 'numan', 'ganye', 'gombi', 'guyuk', 'michika'],
  'akwa ibom': ['uyo', 'ikot ekpene', 'eket', 'oron', 'abak', 'etinan', 'ikono', 'ini'],
  'bauchi': ['bauchi', 'azare', 'misau', 'gombe', 'darazo', 'katagum', 'itas-gadau'],
  'bayelsa': ['yenagoa', 'ogbia', 'brass', 'nembe', 'sagbama', 'ekeremor', 'kolokuma'],
  'benue': ['makurdi', 'gboko', 'otukpo', 'katsina-ala', 'vandekya', 'oturkpo', 'ogbadibo'],
  'borno': ['maiduguri', 'biu', 'bama', 'konduga', 'gwoza', 'chibok', 'damboa'],
  'cross river': ['calabar', 'ogoja', 'ikom', 'obudu', 'akamkpa', 'bekwarra', 'boki'],
  'ebonyi': ['abakaliki', 'onueke', 'afikpo', 'edda', 'amasiri', 'ivo', 'ikwo'],
  'ekiti': ['ado ekiti', 'ikere ekiti', 'ijero ekiti', 'efon alaaye', 'omuo ekiti', 'iyin ekiti'],
  'gombe': ['gombe', 'kaltungo', 'billiri', 'nafada', 'kwami', 'funakaye', 'balanga'],
  'jigawa': ['dutse', 'hadejia', 'gumel', 'kazaure', 'ringim', 'birnin kudu', 'guri'],
  'kaduna': ['kaduna', 'zaria', 'kafanchan', 'kagoro', 'lere', 'kachia', 'soba'],
  'katsina': ['katsina', 'daura', 'funtua', 'malumfashi', 'jibia', 'batsari', 'mashi'],
  'kebbi': ['birnin kebbi', 'argungu', 'yauri', 'koko-besse', 'jega', 'shanga', 'wasagu'],
  'kogi': ['lokoja', 'kabba', 'okene', 'ajaokuta', 'idah', 'ankpa', 'bassa'],
  'kwara': ['ilorin', 'offa', 'omu-aran', 'share', 'kaiama', 'lafiagi', 'patigi'],
  'nasarawa': ['lafia', 'keffi', 'akwanga', 'nasarawa', 'wamba', 'obi', 'doma'],
  'niger': ['minna', 'bida', 'suleja', 'kontagora', 'agaie', 'lapai', 'rijau', 'shiroro'],
  'ogun': ['abeokuta', 'sagamu', 'ijebu ode', 'ilaro', 'shagamu', 'ota', 'igbesa', 'ifo'],
  'ondo': ['akure', 'ondo', 'owo', 'ikare', 'okitipupa', 'idanre', 'ile-oluji'],
  'osun': ['osogbo', 'ilesa', 'ife', 'ede', 'iwo', 'inisa', 'ile-ife', 'ejigbo'],
  'plateau': ['jos', 'bukuru', 'barkin ladi', 'pankshin', 'shendam', 'langtang', 'mangu'],
  'sokoto': ['sokoto', 'tambuwal', 'gwadabawa', 'wurno', 'isa', 'rabah', 'shagari'],
  'taraba': ['jalingo', 'wukari', 'bali', 'gashaka', 'sardauna', 'takum', 'ussa'],
  'yobe': ['damaturu', 'potiskum', 'gashua', 'nguru', 'geidam', 'bade', 'jakusko'],
  'zamfara': ['gusau', 'kaura namoda', 'talata-mafara', 'bungudu', 'shinkafi', 'zurmi'],
}

// Flat list of all state names (keys) — used for quick state detection
const ALL_STATES = Object.keys(NIGERIA_LOCATIONS)

// Reverse map: city → state (built once at module load)
const CITY_TO_STATE: Record<string, string> = {}
for (const [state, cities] of Object.entries(NIGERIA_LOCATIONS)) {
  for (const city of cities) {
    CITY_TO_STATE[city] = state
  }
}

/** Matches a term as a complete word (not a substring of another word). */
function matchesWholeWord(text: string, term: string): boolean {
  // Escape special regex characters in the term, then wrap in word boundaries
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`).test(text)
}

/**
 * Extracts the Nigerian state from an address string.
 * Priority: last comma-segment → full address scan for state names → city name inference.
 * Uses whole-word matching to prevent substring false-positives (e.g. "ring road" ≠ Lagos).
 */
function extractStateFromAddress(address: string): string | null {
  const lower = address.toLowerCase()
  const parts = lower.split(',').map(s => s.trim())

  // 1. Scan segments tail-first — state is usually the last comma-segment
  for (let i = parts.length - 1; i >= 0; i--) {
    for (const state of ALL_STATES) {
      if (matchesWholeWord(parts[i], state)) return state
    }
  }

  // 2. Full address scan for state names
  for (const state of ALL_STATES) {
    if (matchesWholeWord(lower, state)) return state
  }

  // 3. Infer state from city name (fallback — only after state-name checks pass)
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (matchesWholeWord(lower, city)) return state
  }

  return null
}

/**
 * Validates that an address is in Nigeria by checking for a recognised Nigerian
 * STATE name (whole-word only). City names are NOT used for validation to prevent
 * common English words like "gate" or "ring road" from matching non-Nigerian addresses.
 */
function isNigerianAddress(address: string): boolean {
  const lower = address.toLowerCase()
  const parts = lower.split(',').map(s => s.trim())

  for (const part of parts) {
    for (const state of ALL_STATES) {
      if (matchesWholeWord(part, state)) return true
    }
  }
  return false
}

function capitaliseFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
