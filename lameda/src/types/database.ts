export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          id: string
          ip_address: string | null
          merchant_id: string | null
          metadata: Json
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          merchant_id?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          merchant_id?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          created_at: string
          failed_count: number
          id: string
          merchant_id: string
          message: string
          segment: Database["public"]["Enums"]["broadcast_segment"]
          sent_at: string | null
          sent_count: number
          status: Database["public"]["Enums"]["broadcast_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          id?: string
          merchant_id: string
          message: string
          segment: Database["public"]["Enums"]["broadcast_segment"]
          sent_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["broadcast_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          id?: string
          merchant_id?: string
          message?: string
          segment?: Database["public"]["Enums"]["broadcast_segment"]
          sent_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["broadcast_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_campaigns_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          customer_id: string
          delivered: boolean
          error_message: string | null
          id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_id: string
          delivered?: boolean
          error_message?: string | null
          id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_id?: string
          delivered?: boolean
          error_message?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "broadcast_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          cart: Json
          cart_recovery_1_sent_at: string | null
          cart_recovery_2_sent_at: string | null
          created_at: string
          current_intent: string | null
          customer_id: string
          id: string
          last_message_at: string | null
          merchant_id: string
          message_count: number
          state: Json
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string
        }
        Insert: {
          cart?: Json
          cart_recovery_1_sent_at?: string | null
          cart_recovery_2_sent_at?: string | null
          created_at?: string
          current_intent?: string | null
          customer_id: string
          id?: string
          last_message_at?: string | null
          merchant_id: string
          message_count?: number
          state?: Json
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Update: {
          cart?: Json
          cart_recovery_1_sent_at?: string | null
          cart_recovery_2_sent_at?: string | null
          created_at?: string
          current_intent?: string | null
          customer_id?: string
          id?: string
          last_message_at?: string | null
          merchant_id?: string
          message_count?: number
          state?: Json
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          language_preference: string
          merchant_id: string
          metadata: Json
          opted_in: boolean
          opted_in_at: string | null
          opted_out_at: string | null
          phone_number: string
          updated_at: string
          whatsapp_name: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          language_preference?: string
          merchant_id: string
          metadata?: Json
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          phone_number: string
          updated_at?: string
          whatsapp_name?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          language_preference?: string
          merchant_id?: string
          metadata?: Json
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          phone_number?: string
          updated_at?: string
          whatsapp_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_delivery_zones: {
        Row: {
          created_at: string
          fee_kobo: number
          id: string
          is_default: boolean
          keywords: string[]
          merchant_id: string
          sort_order: number
          zone_name: string
        }
        Insert: {
          created_at?: string
          fee_kobo: number
          id?: string
          is_default?: boolean
          keywords?: string[]
          merchant_id: string
          sort_order?: number
          zone_name: string
        }
        Update: {
          created_at?: string
          fee_kobo?: number
          id?: string
          is_default?: boolean
          keywords?: string[]
          merchant_id?: string
          sort_order?: number
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_delivery_zones_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          admin_telegram_chat_id: string | null
          api_key: string | null
          auth_user_id: string | null
          bot_health_checked_at: string | null
          bot_health_score: number | null
          bot_name: string
          bot_personality: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          default_delivery_fee_kobo: number
          email: string
          email_hash: string | null
          first_customer_message_at: string | null
          id: string
          is_active: boolean
          is_directory_listed: boolean
          merchant_config: Json
          ndpr_consent_at: string | null
          owner_name: string
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          pickup_address: string | null
          referral_code: string | null
          referral_rewarded_at: string | null
          referred_by_code: string | null
          subscription_renews_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          telegram_bot_token: string | null
          termii_instance_id: string | null
          trial_ends_at: string | null
          updated_at: string
          webhook_configured_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          admin_telegram_chat_id?: string | null
          api_key?: string | null
          auth_user_id?: string | null
          bot_health_checked_at?: string | null
          bot_health_score?: number | null
          bot_name?: string
          bot_personality?: string | null
          business_name: string
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          default_delivery_fee_kobo?: number
          email: string
          email_hash?: string | null
          first_customer_message_at?: string | null
          id?: string
          is_active?: boolean
          is_directory_listed?: boolean
          merchant_config?: Json
          ndpr_consent_at?: string | null
          owner_name: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          pickup_address?: string | null
          referral_code?: string | null
          referral_rewarded_at?: string | null
          referred_by_code?: string | null
          subscription_renews_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          telegram_bot_token?: string | null
          termii_instance_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          webhook_configured_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          admin_telegram_chat_id?: string | null
          api_key?: string | null
          auth_user_id?: string | null
          bot_health_checked_at?: string | null
          bot_health_score?: number | null
          bot_name?: string
          bot_personality?: string | null
          business_name?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          default_delivery_fee_kobo?: number
          email?: string
          email_hash?: string | null
          first_customer_message_at?: string | null
          id?: string
          is_active?: boolean
          is_directory_listed?: boolean
          merchant_config?: Json
          ndpr_consent_at?: string | null
          owner_name?: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          pickup_address?: string | null
          referral_code?: string | null
          referral_rewarded_at?: string | null
          referred_by_code?: string | null
          subscription_renews_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          telegram_bot_token?: string | null
          termii_instance_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          webhook_configured_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      merchant_staff: {
        Row: {
          id: string
          merchant_id: string
          auth_user_id: string | null
          role: string
          name: string
          email: string
          email_hash: string
          is_active: boolean
          invited_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          auth_user_id?: string | null
          role?: string
          name: string
          email: string
          email_hash: string
          is_active?: boolean
          invited_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          auth_user_id?: string | null
          role?: string
          name?: string
          email?: string
          email_hash?: string
          is_active?: boolean
          invited_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          customer_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_message_id: string | null
          id: string
          merchant_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          customer_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_message_id?: string | null
          id?: string
          merchant_id: string
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          customer_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          external_message_id?: string | null
          id?: string
          merchant_id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          conversation_id: string
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_fee_kobo: number
          delivery_method: Database["public"]["Enums"]["delivery_method"] | null
          id: string
          line_items: Json
          merchant_id: string
          notes: string | null
          reference: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_kobo: number
          total_kobo: number
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_fee_kobo?: number
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          id?: string
          line_items?: Json
          merchant_id: string
          notes?: string | null
          reference: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_kobo: number
          total_kobo: number
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_fee_kobo?: number
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          id?: string
          line_items?: Json
          merchant_id?: string
          notes?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_kobo?: number
          total_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kobo: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          merchant_id: string
          metadata: Json
          order_id: string
          paid_at: string | null
          payment_channel: string | null
          paystack_access_code: string | null
          paystack_reference: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          merchant_id: string
          metadata?: Json
          order_id: string
          paid_at?: string | null
          payment_channel?: string | null
          paystack_access_code?: string | null
          paystack_reference: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          merchant_id?: string
          metadata?: Json
          order_id?: string
          paid_at?: string | null
          payment_channel?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          merchant_id: string
          model_version: string
          product_id: string
          text_content: string
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          merchant_id: string
          model_version?: string
          product_id: string
          text_content: string
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          merchant_id?: string
          model_version?: string
          product_id?: string
          text_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          product_id: string
          size: string | null
          sku_variant: string | null
          stock_count: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          product_id: string
          size?: string | null
          sku_variant?: string | null
          stock_count?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          product_id?: string
          size?: string | null
          sku_variant?: string | null
          stock_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          colors: string[]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          merchant_id: string
          metadata: Json
          name: string
          price_kobo: number
          sizes: string[]
          stock_count: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          colors?: string[]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          merchant_id: string
          metadata?: Json
          name: string
          price_kobo: number
          sizes?: string[]
          stock_count?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          colors?: string[]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          merchant_id?: string
          metadata?: Json
          name?: string
          price_kobo?: number
          sizes?: string[]
          stock_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          external_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          source: Database["public"]["Enums"]["webhook_source"]
          status: Database["public"]["Enums"]["webhook_status"]
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          source: Database["public"]["Enums"]["webhook_source"]
          status?: Database["public"]["Enums"]["webhook_status"]
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          source?: Database["public"]["Enums"]["webhook_source"]
          status?: Database["public"]["Enums"]["webhook_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_customer: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
      get_merchant_id: { Args: never; Returns: string }
      search_products_by_embedding: {
        Args: {
          p_embedding: string
          p_limit?: number
          p_merchant_id: string
          p_threshold?: number
        }
        Returns: {
          category: string
          colors: string[]
          description: string
          id: string
          image_url: string
          name: string
          price_kobo: number
          similarity: number
          sizes: string[]
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      actor_type: "merchant" | "customer" | "system" | "admin"
      broadcast_segment: "all_opted_in" | "past_buyers" | "abandoned_cart"
      broadcast_status: "draft" | "sending" | "sent" | "failed"
      business_type:
        | "fashion"
        | "food"
        | "electronics"
        | "beauty"
        | "services"
        | "general"
      conversation_status: "active" | "idle" | "closed"
      delivery_method: "pickup" | "delivery"
      message_direction: "inbound" | "outbound"
      message_type: "text" | "image" | "button" | "list" | "template"
      order_status:
        | "pending"
        | "confirmed"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "success" | "failed" | "refunded"
      subscription_status: "trial" | "active" | "suspended" | "cancelled"
      subscription_tier: "starter" | "growth" | "pro"
      webhook_source: "termii" | "paystack" | "telegram"
      webhook_status: "received" | "processed" | "failed" | "duplicate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      actor_type: ["merchant", "customer", "system", "admin"],
      broadcast_segment: ["all_opted_in", "past_buyers", "abandoned_cart"],
      broadcast_status: ["draft", "sending", "sent", "failed"],
      business_type: [
        "fashion",
        "food",
        "electronics",
        "beauty",
        "services",
        "general",
      ],
      conversation_status: ["active", "idle", "closed"],
      delivery_method: ["pickup", "delivery"],
      message_direction: ["inbound", "outbound"],
      message_type: ["text", "image", "button", "list", "template"],
      order_status: [
        "pending",
        "confirmed",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "success", "failed", "refunded"],
      subscription_status: ["trial", "active", "suspended", "cancelled"],
      subscription_tier: ["starter", "growth", "pro"],
      webhook_source: ["termii", "paystack", "telegram"],
      webhook_status: ["received", "processed", "failed", "duplicate"],
    },
  },
} as const
