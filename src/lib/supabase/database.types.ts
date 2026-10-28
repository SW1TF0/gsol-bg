// Генерирано от Supabase (generate_typescript_types). Не редактирайте ръчно — генерирайте отново след миграция.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          is_active: boolean;
          name: string;
          parent_id: number | null;
          price_ranges: Json;
          slug: string;
          sort_order: number;
          tagline: string | null;
        };
        Insert: {
          id?: never;
          is_active?: boolean;
          name: string;
          parent_id?: number | null;
          price_ranges?: Json;
          slug: string;
          sort_order?: number;
          tagline?: string | null;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          name?: string;
          parent_id?: number | null;
          price_ranges?: Json;
          slug?: string;
          sort_order?: number;
          tagline?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          company: Json | null;
          created_at: string;
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          marketing_opt_in: boolean;
          phone: string | null;
          user_id: string | null;
        };
        Insert: {
          company?: Json | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          phone?: string | null;
          user_id?: string | null;
        };
        Update: {
          company?: Json | null;
          created_at?: string;
          email?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          phone?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      order_events: {
        Row: {
          actor: string | null;
          created_at: string;
          data: Json;
          id: number;
          order_id: number;
          type: string;
        };
        Insert: {
          actor?: string | null;
          created_at?: string;
          data?: Json;
          id?: never;
          order_id: number;
          type: string;
        };
        Update: {
          actor?: string | null;
          created_at?: string;
          data?: Json;
          id?: never;
          order_id?: number;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          discount_cents: number;
          id: number;
          line_total_cents: number;
          name: string;
          order_id: number;
          product_id: number | null;
          qty: number;
          sku: string | null;
          unit_price_cents: number;
        };
        Insert: {
          discount_cents?: number;
          id?: never;
          line_total_cents: number;
          name: string;
          order_id: number;
          product_id?: number | null;
          qty: number;
          sku?: string | null;
          unit_price_cents: number;
        };
        Update: {
          discount_cents?: number;
          id?: never;
          line_total_cents?: number;
          name?: string;
          order_id?: number;
          product_id?: number | null;
          qty?: number;
          sku?: string | null;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_id: string | null;
          discount_cents: number;
          econt_office: string | null;
          email: string;
          first_name: string;
          id: number;
          invoice: Json | null;
          last_name: string;
          note: string | null;
          number: string;
          payment_method: string;
          phone: string;
          promo_code: string | null;
          promo_code_id: number | null;
          shipping_address: string | null;
          shipping_cents: number;
          shipping_city: string;
          shipping_method: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
          utm: Json | null;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          discount_cents?: number;
          econt_office?: string | null;
          email: string;
          first_name: string;
          id?: never;
          invoice?: Json | null;
          last_name: string;
          note?: string | null;
          number?: string;
          payment_method: string;
          phone: string;
          promo_code?: string | null;
          promo_code_id?: number | null;
          shipping_address?: string | null;
          shipping_cents?: number;
          shipping_city: string;
          shipping_method: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          total_cents: number;
          updated_at?: string;
          utm?: Json | null;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          discount_cents?: number;
          econt_office?: string | null;
          email?: string;
          first_name?: string;
          id?: never;
          invoice?: Json | null;
          last_name?: string;
          note?: string | null;
          number?: string;
          payment_method?: string;
          phone?: string;
          promo_code?: string | null;
          promo_code_id?: number | null;
          shipping_address?: string | null;
          shipping_cents?: number;
          shipping_city?: string;
          shipping_method?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
          utm?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey";
            columns: ["promo_code_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand: string | null;
          category_id: number | null;
          components: Json | null;
          created_at: string;
          delivery_days: string;
          description: string | null;
          free_windows: boolean;
          id: number;
          images: string[];
          is_active: boolean;
          is_promo: boolean;
          name: string;
          price_cents: number;
          regular_price_cents: number | null;
          sku: string | null;
          slug: string;
          source: string;
          specs: Json;
          stock_qty: number | null;
          stock_status: string;
          summary: string | null;
          tier: string | null;
          updated_at: string;
        };
        Insert: {
          brand?: string | null;
          category_id?: number | null;
          components?: Json | null;
          created_at?: string;
          delivery_days?: string;
          description?: string | null;
          free_windows?: boolean;
          id?: number;
          images?: string[];
          is_active?: boolean;
          is_promo?: boolean;
          name: string;
          price_cents: number;
          regular_price_cents?: number | null;
          sku?: string | null;
          slug: string;
          source?: string;
          specs?: Json;
          stock_qty?: number | null;
          stock_status?: string;
          summary?: string | null;
          tier?: string | null;
          updated_at?: string;
        };
        Update: {
          brand?: string | null;
          category_id?: number | null;
          components?: Json | null;
          created_at?: string;
          delivery_days?: string;
          description?: string | null;
          free_windows?: boolean;
          id?: number;
          images?: string[];
          is_active?: boolean;
          is_promo?: boolean;
          name?: string;
          price_cents?: number;
          regular_price_cents?: number | null;
          sku?: string | null;
          slug?: string;
          source?: string;
          specs?: Json;
          stock_qty?: number | null;
          stock_status?: string;
          summary?: string | null;
          tier?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_codes: {
        Row: {
          allowed_emails: string[];
          amount_cents: number | null;
          batch_id: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          ends_at: string | null;
          exclude_promo_items: boolean;
          first_order_only: boolean;
          id: number;
          is_active: boolean;
          max_discount_cents: number | null;
          min_subtotal_cents: number;
          partner: string | null;
          per_customer_limit: number | null;
          percent: number | null;
          scope: string;
          scope_brands: string[];
          scope_category_ids: number[];
          scope_product_ids: number[];
          starts_at: string | null;
          times_used: number;
          usage_limit: number | null;
        };
        Insert: {
          allowed_emails?: string[];
          amount_cents?: number | null;
          batch_id?: string | null;
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          ends_at?: string | null;
          exclude_promo_items?: boolean;
          first_order_only?: boolean;
          id?: never;
          is_active?: boolean;
          max_discount_cents?: number | null;
          min_subtotal_cents?: number;
          partner?: string | null;
          per_customer_limit?: number | null;
          percent?: number | null;
          scope?: string;
          scope_brands?: string[];
          scope_category_ids?: number[];
          scope_product_ids?: number[];
          starts_at?: string | null;
          times_used?: number;
          usage_limit?: number | null;
        };
        Update: {
          allowed_emails?: string[];
          amount_cents?: number | null;
          batch_id?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          ends_at?: string | null;
          exclude_promo_items?: boolean;
          first_order_only?: boolean;
          id?: never;
          is_active?: boolean;
          max_discount_cents?: number | null;
          min_subtotal_cents?: number;
          partner?: string | null;
          per_customer_limit?: number | null;
          percent?: number | null;
          scope?: string;
          scope_brands?: string[];
          scope_category_ids?: number[];
          scope_product_ids?: number[];
          starts_at?: string | null;
          times_used?: number;
          usage_limit?: number | null;
        };
        Relationships: [];
      };
      promo_redemptions: {
        Row: {
          created_at: string;
          discount_cents: number;
          email: string;
          id: number;
          order_id: number;
          promo_code_id: number;
        };
        Insert: {
          created_at?: string;
          discount_cents: number;
          email: string;
          id?: never;
          order_id: number;
          promo_code_id: number;
        };
        Update: {
          created_at?: string;
          discount_cents?: number;
          email?: string;
          id?: never;
          order_id?: number;
          promo_code_id?: number;
        };
        Relationships: [];
      };
      settings: {
        Row: { key: string; updated_at: string; value: Json };
        Insert: { key: string; updated_at?: string; value: Json };
        Update: { key?: string; updated_at?: string; value?: Json };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          display_name: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      place_order: { Args: { p_items: Json; p_order: Json }; Returns: Json };
      quote_order: {
        Args: { p_code?: string; p_items: Json; p_shipping_method?: string };
        Returns: Json;
      };
    };
    Enums: {
      discount_type: "percent" | "fixed" | "free_shipping";
      order_status: "new" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
      staff_role: "admin" | "manager" | "sales" | "technician" | "editor";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      discount_type: ["percent", "fixed", "free_shipping"],
      order_status: ["new", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
      staff_role: ["admin", "manager", "sales", "technician", "editor"],
    },
  },
} as const;
