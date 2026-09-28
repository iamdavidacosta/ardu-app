export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type StoreRow = {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

type ProductRow = {
  id: string
  user_id: string
  name: string
  presentation_quantity: number
  presentation_unit: string
  category: string | null
  active: boolean
  created_at: string
  updated_at: string
}

type ShoppingTripRow = {
  id: string
  user_id: string
  store_id: string
  shopping_date: string
  status: string
  created_at: string
  updated_at: string
}

type ShoppingItemRow = {
  id: string
  user_id: string
  shopping_trip_id: string
  product_id: string
  product_name_snapshot: string
  presentation_quantity_snapshot: number
  presentation_unit_snapshot: string
  unit_price: number
  quantity_purchased: number
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: StoreRow
        Insert: Pick<StoreRow, 'user_id' | 'name'> & Partial<Pick<StoreRow, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Pick<StoreRow, 'name'>>
        Relationships: []
      }
      products: {
        Row: ProductRow
        Insert: Pick<ProductRow, 'user_id' | 'name' | 'presentation_quantity' | 'presentation_unit'> &
          Partial<Pick<ProductRow, 'id' | 'category' | 'active' | 'created_at' | 'updated_at'>>
        Update: Partial<Pick<ProductRow, 'name' | 'presentation_quantity' | 'presentation_unit' | 'category' | 'active'>>
        Relationships: []
      }
      shopping_trips: {
        Row: ShoppingTripRow
        Insert: Pick<ShoppingTripRow, 'user_id' | 'store_id' | 'shopping_date'> &
          Partial<Pick<ShoppingTripRow, 'id' | 'status' | 'created_at' | 'updated_at'>>
        Update: Partial<Pick<ShoppingTripRow, 'store_id' | 'shopping_date'>>
        Relationships: []
      }
      shopping_items: {
        Row: ShoppingItemRow
        Insert: Pick<ShoppingItemRow, 'user_id' | 'shopping_trip_id' | 'product_id' | 'unit_price' | 'quantity_purchased'> &
          Partial<Pick<ShoppingItemRow, 'id' | 'product_name_snapshot' | 'presentation_quantity_snapshot' | 'presentation_unit_snapshot' | 'created_at'>>
        Update: Partial<Pick<ShoppingItemRow, 'unit_price' | 'quantity_purchased'>>
        Relationships: []
      }
    }
    Views: {
      shopping_trip_summaries: {
        Row: {
          id: string | null
          user_id: string | null
          store_id: string | null
          store_name: string | null
          shopping_date: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          total: number | null
          product_count: number | null
        }
        Relationships: []
      }
      product_price_history: {
        Row: {
          shopping_item_id: string | null
          user_id: string | null
          product_id: string | null
          shopping_trip_id: string | null
          store_id: string | null
          store_name: string | null
          shopping_date: string | null
          completed_at: string | null
          unit_price: number | null
          quantity_purchased: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_initial_stores: {
        Args: Record<PropertyKey, never>
        Returns: StoreRow[]
      }
      finalize_shopping_trip: {
        Args: { p_shopping_trip_id: string }
        Returns: { trip_id: string; trip_status: string; trip_updated_at: string }[]
      }
    }
    Enums: Record<PropertyKey, never>
    CompositeTypes: Record<PropertyKey, never>
  }
}
