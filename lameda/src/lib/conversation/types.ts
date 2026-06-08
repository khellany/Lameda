/**
 * Core types for the Lameda conversation state machine.
 *
 * All state is serialized to JSONB and stored in conversations.state.
 * Keep types flat and JSON-safe — no classes, no Date objects, no undefined.
 */

// ----------------------------------------------------------------
// INTENT
// ----------------------------------------------------------------

export type Intent =
  | 'greeting'         // Hello, hi, good morning
  | 'social_phrase'    // Thank you, okay, great, got it — acknowledgements
  | 'browse_products'  // Show me dresses, what do you have, catalog
  | 'product_inquiry'  // Do you have size 12? What colors? How much?
  | 'add_to_cart'      // I want this one, add to cart, buy this
  | 'view_cart'        // Show my cart, what's in my basket
  | 'remove_from_cart' // Remove item, delete from cart
  | 'checkout'         // I want to buy, proceed, checkout
  | 'provide_address'  // Customer is giving delivery address
  | 'confirm_order'    // Yes, confirm, proceed with order
  | 'cancel'           // No, cancel, stop, nevermind
  | 'order_status'     // Where is my order? Track my order
  | 'complaint'        // Return, wrong item, complaint, refund
  | 'support'          // Help, general question
  | 'unknown'          // Could not classify

export interface ClassifiedIntent {
  intent: Intent
  confidence: 'high' | 'medium' | 'low'
  /** Detected language: 'en' = English, 'pcm' = Nigerian Pidgin */
  language?: string
  /** Extracted entities - product name, size, color, quantity etc */
  entities: {
    productQuery?: string
    size?: string
    color?: string
    quantity?: number
    address?: string
  }
  /** The raw intent string from Claude before mapping */
  raw: string
}

// ----------------------------------------------------------------
// CONVERSATION STATE
// ----------------------------------------------------------------

export type ConversationPhase =
  | 'greeting'
  | 'browsing'
  | 'product_detail'
  | 'selecting_quantity'    // Waiting for customer to choose how many
  | 'selecting_size'        // Waiting for customer to choose a size
  | 'selecting_color'       // Waiting for customer to choose a color
  | 'searching_by_image'    // Waiting for customer to send a photo
  | 'selecting_delivery'    // Waiting for delivery vs pickup choice
  | 'selecting_logistics'   // Outside Lagos — waiting for GIG vs Park Waybill
  | 'cart_review'
  | 'collecting_address'
  | 'confirming_order'
  | 'payment_pending'       // Payment link sent — waiting for Paystack webhook
  | 'payment_sent'
  | 'completed'
  | 'support'
  | 'complaint'             // Structured complaint/return flow

export interface ConversationState {
  phase: ConversationPhase
  channel: 'telegram' | 'whatsapp'
  /** Product ID currently being viewed or being configured for cart */
  activeProductId?: string
  /** Size selected during selecting_size phase */
  pendingSize?: string
  /** Color selected during selecting_color phase */
  pendingColor?: string
  /** Quantity selected during selecting_quantity phase */
  pendingQuantity?: number
  /** Delivery method chosen: 'delivery' | 'pickup' */
  pendingDeliveryMethod?: 'delivery' | 'pickup'
  /** Last search query for context */
  lastQuery?: string
  /** Delivery address being collected */
  pendingAddress?: string
  /** Logistics method for outside-Lagos orders: 'gig' | 'park_waybill' */
  pendingLogisticsType?: 'gig' | 'park_waybill'
  /** Order reference if order was created */
  activeOrderId?: string
  /** Detected language: 'en' | 'pcm' (Nigerian Pidgin) */
  language?: string
}

// ----------------------------------------------------------------
// CART
// ----------------------------------------------------------------

export interface CartItem {
  productId: string
  name: string
  priceKobo: number
  quantity: number
  size?: string
  color?: string
  imageUrl?: string | null
}

export interface Cart {
  items: CartItem[]
  totalKobo: number
}

// ----------------------------------------------------------------
// PRODUCT (lightweight - for passing between handlers)
// ----------------------------------------------------------------

export interface ProductSummary {
  id: string
  name: string
  priceKobo: number
  description: string | null
  sizes: string[]
  colors: string[]
  imageUrl: string | null
  category: string | null
  /** null = unlimited stock; 0 = out of stock; >0 = units available */
  stockCount: number | null
}

// ----------------------------------------------------------------
// STATE MACHINE CONTEXT (what every handler receives)
// ----------------------------------------------------------------

export interface ConversationContext {
  merchantId: string
  customerId: string
  conversationId: string
  botToken: string
  chatId: string
  state: ConversationState
  cart: Cart
  intent: ClassifiedIntent
  rawMessage: string
  /** Telegram file_id when the customer sent a photo or document */
  mediaUrl: string | null
}

// ----------------------------------------------------------------
// HANDLER RESULT
// ----------------------------------------------------------------

export interface HandlerResult {
  /** Updated conversation state to persist */
  newState: ConversationState
  /** Updated cart to persist */
  newCart: Cart
  /** Message text sent to customer (for DB persistence) */
  replySent: string
}
