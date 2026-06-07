/**
 * Database type definitions for Lameda.
 *
 * HOW TO REGENERATE (after Supabase project is provisioned):
 *   npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
 *
 * TECHNICAL DEBT (TD-001):
 * Hand-authored for MVP. Replace with auto-generated types post-provisioning.
 * Each table requires Relationships: [] to satisfy the Supabase v2
 * GenericTable constraint - without it, all .from() calls resolve to never.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type SubscriptionTier = 'starter' | 'growth' | 'pro'
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled'
export type ConversationStatus = 'active' | 'idle' | 'closed'
export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'button' | 'list' | 'template'
export type WebhookSource = 'termii' | 'paystack'
export type WebhookEventStatus = 'received' | 'processed' | 'failed' | 'duplicate'
export type ActorType = 'merchant' | 'customer' | 'system' | 'admin'
export type DeliveryMethod = 'pickup' | 'delivery'

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          business_name: string
          owner_name: string
          email: string
          whatsapp_number: string
          subscription_tier: SubscriptionTier
          subscription_status: SubscriptionStatus
          trial_ends_at: string | null
          termii_instance_id: string | null
          paystack_customer_code: string | null
          bot_name: string
          bot_personality: string | null
          ndpr_consent_at: string | null
          is_active: boolean
        }
        Insert: {
          business_name: string
          owner_name: string
          email: string
          whatsapp_number: string
          subscription_tier?: SubscriptionTier
          subscription_status?: SubscriptionStatus
          trial_ends_at?: string | null
          termii_instance_id?: string | null
          paystack_customer_code?: string | null
          bot_name?: string
          bot_personality?: string | null
          ndpr_consent_at?: string | null
          is_active?: boolean
        }
        Update: {
          business_name?: string
          owner_name?: string
          email?: string
          whatsapp_number?: string
          subscription_tier?: SubscriptionTier
          subscription_status?: SubscriptionStatus
          trial_ends_at?: string | null
          termii_instance_id?: string | null
          paystack_customer_code?: string | null
          bot_name?: string
          bot_personality?: string | null
          ndpr_consent_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }

      customers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          merchant_id: string
          phone_number: string
          display_name: string | null
          whatsapp_name: string | null
          opted_in: boolean
          opted_in_at: string | null
          opted_out_at: string | null
          language_preference: string
          metadata: Json
        }
        Insert: {
          merchant_id: string
          phone_number: string
          display_name?: string | null
          whatsapp_name?: string | null
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          language_preference?: string
          metadata?: Json
        }
        Update: {
          display_name?: string | null
          whatsapp_name?: string | null
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          language_preference?: string
          metadata?: Json
        }
        Relationships: []
      }

      products: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          merchant_id: string
          name: string
          description: string | null
          price_kobo: number
          category: string | null
          sizes: string[]
          colors: string[]
          stock_count: number | null
          image_url: string | null
          is_active: boolean
          metadata: Json
        }
        Insert: {
          merchant_id: string
          name: string
          description?: string | null
          price_kobo: number
          category?: string | null
          sizes?: string[]
          colors?: string[]
          stock_count?: number | null
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
        }
        Update: {
          name?: string
          description?: string | null
          price_kobo?: number
          category?: string | null
          sizes?: string[]
          colors?: string[]
          stock_count?: number | null
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
        }
        Relationships: []
      }

      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          merchant_id: string
          customer_id: string
          status: ConversationStatus
          state: Json
          current_intent: string | null
          cart: Json
          last_message_at: string | null
          message_count: number
        }
        Insert: {
          merchant_id: string
          customer_id: string
          status?: ConversationStatus
          state?: Json
          current_intent?: string | null
          cart?: Json
          last_message_at?: string | null
          message_count?: number
        }
        Update: {
          status?: ConversationStatus
          state?: Json
          current_intent?: string | null
          cart?: Json
          last_message_at?: string | null
          message_count?: number
        }
        Relationships: []
      }

      messages: {
        Row: {
          id: string
          created_at: string
          conversation_id: string
          merchant_id: string
          customer_id: string
          direction: MessageDirection
          content: string
          message_type: MessageType
          external_message_id: string | null
          metadata: Json
        }
        Insert: {
          conversation_id: string
          merchant_id: string
          customer_id: string
          direction: MessageDirection
          content: string
          message_type?: MessageType
          external_message_id?: string | null
          metadata?: Json
        }
        Update: {
          content?: string
          metadata?: Json
        }
        Relationships: []
      }

      orders: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          merchant_id: string
          customer_id: string
          conversation_id: string
          status: OrderStatus
          line_items: Json
          subtotal_kobo: number
          delivery_fee_kobo: number
          total_kobo: number
          delivery_address: string | null
          delivery_method: DeliveryMethod | null
          notes: string | null
          reference: string
        }
        Insert: {
          merchant_id: string
          customer_id: string
          conversation_id: string
          status?: OrderStatus
          line_items?: Json
          subtotal_kobo: number
          delivery_fee_kobo?: number
          total_kobo: number
          delivery_address?: string | null
          delivery_method?: DeliveryMethod | null
          notes?: string | null
          reference: string
        }
        Update: {
          status?: OrderStatus
          line_items?: Json
          subtotal_kobo?: number
          delivery_fee_kobo?: number
          total_kobo?: number
          delivery_address?: string | null
          delivery_method?: DeliveryMethod | null
          notes?: string | null
        }
        Relationships: []
      }

      payments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          order_id: string
          merchant_id: string
          status: PaymentStatus
          amount_kobo: number
          currency: string
          paystack_reference: string
          paystack_access_code: string | null
          payment_channel: string | null
          paid_at: string | null
          metadata: Json
        }
        Insert: {
          order_id: string
          merchant_id: string
          status?: PaymentStatus
          amount_kobo: number
          currency?: string
          paystack_reference: string
          paystack_access_code?: string | null
          payment_channel?: string | null
          paid_at?: string | null
          metadata?: Json
        }
        Update: {
          status?: PaymentStatus
          paystack_access_code?: string | null
          payment_channel?: string | null
          paid_at?: string | null
          metadata?: Json
        }
        Relationships: []
      }

      webhook_events: {
        Row: {
          id: string
          created_at: string
          source: WebhookSource
          event_type: string
          external_id: string | null
          status: WebhookEventStatus
          payload: Json
          error_message: string | null
          processed_at: string | null
        }
        Insert: {
          source: WebhookSource
          event_type: string
          external_id?: string | null
          status?: WebhookEventStatus
          payload: Json
          error_message?: string | null
          processed_at?: string | null
        }
        Update: {
          status?: WebhookEventStatus
          error_message?: string | null
          processed_at?: string | null
        }
        Relationships: []
      }

      audit_logs: {
        Row: {
          id: string
          created_at: string
          merchant_id: string | null
          actor_id: string | null
          actor_type: ActorType
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Json
          ip_address: string | null
        }
        Insert: {
          merchant_id?: string | null
          actor_id?: string | null
          actor_type: ActorType
          action: string
          resource_type: string
          resource_id?: string | null
          metadata?: Json
          ip_address?: string | null
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
