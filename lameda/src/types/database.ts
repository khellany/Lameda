/**
 * Database type definitions for Lameda.
 *
 * This file is the source of truth for all table shapes used by the
 * Supabase client. Keep this in sync with supabase/migrations/.
 *
 * HOW TO REGENERATE:
 *   npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
 *
 * TECHNICAL DEBT:
 * - This file is hand-authored for MVP. Once the Supabase project is
 *   provisioned, replace with auto-generated types using the command
 *   above. Auto-generated types are always accurate; hand-authored
 *   types drift as the schema evolves.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type SubscriptionTier = 'starter' | 'growth' | 'pro'
export type ConversationStatus = 'active' | 'idle' | 'closed'
export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'
export type MessageDirection = 'inbound' | 'outbound'
export type WebhookEventStatus = 'received' | 'processed' | 'failed' | 'duplicate'

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
          subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled'
          trial_ends_at: string | null
          termii_instance_id: string | null
          paystack_customer_code: string | null
          bot_name: string
          bot_personality: string | null
          ndpr_consent_at: string | null
          is_active: boolean
        }
        Insert: Omit<
          Database['public']['Tables']['merchants']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['merchants']['Insert']>
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
        Insert: Omit<
          Database['public']['Tables']['customers']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
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
        Insert: Omit<
          Database['public']['Tables']['products']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['products']['Insert']>
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
        Insert: Omit<
          Database['public']['Tables']['conversations']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
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
          message_type: 'text' | 'image' | 'button' | 'list' | 'template'
          external_message_id: string | null
          metadata: Json
        }
        Insert: Omit<
          Database['public']['Tables']['messages']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
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
          delivery_method: 'pickup' | 'delivery' | null
          notes: string | null
          reference: string
        }
        Insert: Omit<
          Database['public']['Tables']['orders']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
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
        Insert: Omit<
          Database['public']['Tables']['payments']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }

      webhook_events: {
        Row: {
          id: string
          created_at: string
          source: 'termii' | 'paystack'
          event_type: string
          external_id: string | null
          status: WebhookEventStatus
          payload: Json
          error_message: string | null
          processed_at: string | null
        }
        Insert: Omit<
          Database['public']['Tables']['webhook_events']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['webhook_events']['Insert']>
      }

      audit_logs: {
        Row: {
          id: string
          created_at: string
          merchant_id: string | null
          actor_id: string | null
          actor_type: 'merchant' | 'customer' | 'system' | 'admin'
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Json
          ip_address: string | null
        }
        Insert: Omit<
          Database['public']['Tables']['audit_logs']['Row'],
          'id' | 'created_at'
        >
        Update: never
      }
    }
  }
}
