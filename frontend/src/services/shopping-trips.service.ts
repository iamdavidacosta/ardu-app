import { getSupabase } from '../lib/supabase'
import type { Database } from '../types/database'
import type { Product, ShoppingItem, ShoppingTrip, ShoppingTripSummary } from '../types/domain'
import { calculateSubtotal, calculateTotal } from '../utils/shopping'
import { ServiceError, throwIfError } from './service-error'

type TripRow = Database['public']['Tables']['shopping_trips']['Row']
type ItemRow = Database['public']['Tables']['shopping_items']['Row']

async function loadTrip(row: TripRow): Promise<ShoppingTrip> {
  const client = getSupabase()
  const [storeResult, itemsResult] = await Promise.all([
    client.from('stores').select('id, name').eq('id', row.store_id).single(),
    client.from('shopping_items').select('*').eq('shopping_trip_id', row.id).order('created_at'),
  ])
  throwIfError(storeResult.error, 'No fue posible cargar la tienda de la compra.')
  throwIfError(itemsResult.error, 'No fue posible cargar los productos de la compra.')

  const itemRows = (itemsResult.data ?? []) as ItemRow[]
  const items: ShoppingItem[] = itemRows.map((item) => {
    const unitPrice = Number(item.unit_price)
    return {
      id: item.id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      presentationQuantity: Number(item.presentation_quantity_snapshot),
      presentationUnit: item.presentation_unit_snapshot as Product['presentationUnit'],
      unitPrice,
      quantityPurchased: item.quantity_purchased,
      subtotal: calculateSubtotal(unitPrice, item.quantity_purchased),
    }
  })

  return {
    id: row.id,
    storeId: row.store_id,
    storeName: storeResult.data!.name,
    shoppingDate: row.shopping_date,
    status: row.status as ShoppingTrip['status'],
    total: calculateTotal(items),
    items,
  }
}

export const shoppingTripsService = {
  async listCompleted(): Promise<ShoppingTripSummary[]> {
    const { data, error } = await getSupabase()
      .from('shopping_trip_summaries')
      .select('*')
      .eq('status', 'completed')
      .order('shopping_date', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(100)
    throwIfError(error, 'No fue posible cargar el historial de compras.')
    return (data ?? []).map((trip) => ({
      id: trip.id!,
      storeId: trip.store_id!,
      storeName: trip.store_name!,
      shoppingDate: trip.shopping_date!,
      total: Number(trip.total),
      productCount: Number(trip.product_count),
    }))
  },

  async getCurrent(): Promise<ShoppingTrip | null> {
    const { data, error } = await getSupabase()
      .from('shopping_trips')
      .select('*')
      .eq('status', 'draft')
      .maybeSingle()
    throwIfError(error, 'No fue posible recuperar la compra en progreso.')
    return data ? loadTrip(data) : null
  },

  async get(id: string): Promise<ShoppingTrip> {
    const { data, error } = await getSupabase().from('shopping_trips').select('*').eq('id', id).single()
    throwIfError(error, 'No fue posible cargar la compra.')
    return loadTrip(data!)
  },

  async create(userId: string, storeId: string, shoppingDate: string): Promise<ShoppingTrip> {
    const { data, error } = await getSupabase()
      .from('shopping_trips')
      .insert({ user_id: userId, store_id: storeId, shopping_date: shoppingDate })
      .select('*')
      .single()
    throwIfError(error, 'No fue posible iniciar la compra.')
    return loadTrip(data!)
  },

  async changeStore(id: string, storeId: string): Promise<ShoppingTrip> {
    const { data, error } = await getSupabase()
      .from('shopping_trips')
      .update({ store_id: storeId })
      .eq('id', id)
      .select('*')
      .single()
    throwIfError(error, 'No fue posible cambiar la tienda.')
    return loadTrip(data!)
  },

  async addItem(
    userId: string,
    tripId: string,
    productId: string,
    unitPrice: number,
    quantityPurchased: number,
  ): Promise<ShoppingTrip> {
    const { error } = await getSupabase().from('shopping_items').insert({
      user_id: userId,
      shopping_trip_id: tripId,
      product_id: productId,
      unit_price: unitPrice,
      quantity_purchased: quantityPurchased,
    })
    throwIfError(error, 'No fue posible agregar el producto a la compra.')
    return this.get(tripId)
  },

  async updateItem(
    tripId: string,
    itemId: string,
    unitPrice: number,
    quantityPurchased: number,
  ): Promise<void> {
    if (unitPrice < 0) throw new ServiceError('El precio no puede ser negativo.')
    if (quantityPurchased <= 0) throw new ServiceError('La cantidad debe ser mayor que cero.')
    const { error } = await getSupabase()
      .from('shopping_items')
      .update({ unit_price: unitPrice, quantity_purchased: quantityPurchased })
      .eq('id', itemId)
      .eq('shopping_trip_id', tripId)
    throwIfError(error, 'No fue posible guardar los cambios del producto.')
  },

  async deleteItem(tripId: string, itemId: string): Promise<ShoppingTrip> {
    const { error } = await getSupabase()
      .from('shopping_items')
      .delete()
      .eq('id', itemId)
      .eq('shopping_trip_id', tripId)
    throwIfError(error, 'No fue posible eliminar el producto.')
    return this.get(tripId)
  },

  async finalize(id: string): Promise<ShoppingTrip> {
    const { error } = await getSupabase().rpc('finalize_shopping_trip', { p_shopping_trip_id: id })
    throwIfError(error, 'No fue posible finalizar la compra.')
    return this.get(id)
  },
}
