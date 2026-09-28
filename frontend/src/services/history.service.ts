import { getSupabase } from '../lib/supabase'
import type { ProductDetail, PriceHistoryEntry, StorePrice } from '../types/domain'
import { mapProduct } from './products.service'
import { throwIfError } from './service-error'

export const historyService = {
  async getProductDetail(productId: string): Promise<ProductDetail> {
    const client = getSupabase()
    const [productResult, historyResult] = await Promise.all([
      client.from('products').select('*').eq('id', productId).single(),
      client
        .from('product_price_history')
        .select('*')
        .eq('product_id', productId)
        .order('shopping_date', { ascending: false })
        .order('completed_at', { ascending: false }),
    ])

    throwIfError(productResult.error, 'No fue posible cargar el producto.')
    throwIfError(historyResult.error, 'No fue posible cargar el histórico de precios.')

    const priceHistory: PriceHistoryEntry[] = (historyResult.data ?? []).map((entry) => ({
      shoppingTripId: entry.shopping_trip_id!,
      storeId: entry.store_id!,
      storeName: entry.store_name!,
      shoppingDate: entry.shopping_date!,
      unitPrice: Number(entry.unit_price),
    }))
    const lastByStore = new Map<string, StorePrice>()
    for (const entry of priceHistory) {
      if (!lastByStore.has(entry.storeId)) {
        lastByStore.set(entry.storeId, {
          storeId: entry.storeId,
          storeName: entry.storeName,
          lastUnitPrice: entry.unitPrice,
          lastDate: entry.shoppingDate,
        })
      }
    }
    const prices = priceHistory.map((entry) => entry.unitPrice)

    return {
      product: mapProduct(productResult.data!),
      lastPrice: priceHistory[0]?.unitPrice ?? null,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      highestPrice: prices.length ? Math.max(...prices) : null,
      priceHistory,
      lastPricesByStore: [...lastByStore.values()].sort((left, right) => left.lastUnitPrice - right.lastUnitPrice),
    }
  },
}
