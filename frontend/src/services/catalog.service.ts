import { getSupabase } from '../lib/supabase'
import type { Database } from '../types/database'
import type { CatalogProduct } from '../types/domain'
import { ServiceError, throwIfError } from './service-error'

type CatalogRow = Database['public']['Tables']['catalog_products']['Row']
const isMissingCatalog = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

const mapCatalogProduct = (row: CatalogRow): CatalogProduct => ({
  code: row.code,
  productName: row.product_name,
  quantity: row.quantity,
})

export const catalogService = {
  async getFromOpenFoodFacts(code: string): Promise<(CatalogProduct & { productName: string }) | null> {
    if (!/^\d{4,32}$/.test(code)) throw new ServiceError('Código de barras inválido.')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let payload: unknown
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=code,product_name,quantity`, {
        signal: controller.signal,
      })
      if (!response.ok) throw new ServiceError('Open Food Facts no está disponible. Intenta de nuevo o completa el producto manualmente.')
      payload = await response.json()
    } catch (caught) {
      if (caught instanceof ServiceError) throw caught
      throw new ServiceError('No pudimos conectar con Open Food Facts. Puedes ingresar el producto manualmente.')
    } finally {
      clearTimeout(timeout)
    }
    if (!payload || typeof payload !== 'object' || !('status' in payload) || payload.status !== 1 || !('product' in payload)) return null
    const product = payload.product
    if (!product || typeof product !== 'object' || !('code' in product) || product.code !== code) return null
    const found: CatalogProduct = {
      code,
      productName: 'product_name' in product && typeof product.product_name === 'string' ? product.product_name : null,
      quantity: 'quantity' in product && typeof product.quantity === 'string' ? product.quantity : null,
    }
    if (!found.productName?.trim()) return null
    return {
      code,
      productName: found.productName.trim().slice(0, 120),
      quantity: found.quantity?.trim().slice(0, 120) || null,
    }
  },

  async add(code: string, productName: string, quantity: string | null): Promise<CatalogProduct> {
    const name = productName.trim()
    const presentation = quantity?.trim() || null
    if (!/^\d{4,32}$/.test(code) || !name || name.length > 120 || (presentation?.length ?? 0) > 120) {
      throw new ServiceError('Revisa el nombre y la presentación del producto.')
    }
    const { data, error } = await getSupabase().from('catalog_products')
      .insert({ code, product_name: name, quantity: presentation })
      .select('code, product_name, quantity').single()
    if (error?.code === '23505') {
      const existing = await this.getByCode(code)
      if (existing) return existing
    }
    throwIfError(error, 'No fue posible guardar el producto en el catálogo compartido. Aplica la migración de contribuciones en Supabase.')
    return mapCatalogProduct(data!)
  },

  async update(code: string, productName: string, quantity: string | null): Promise<CatalogProduct> {
    const name = productName.trim()
    const presentation = quantity?.trim() || null
    if (!/^\d{4,32}$/.test(code) || !name || name.length > 120 || (presentation?.length ?? 0) > 120) {
      throw new ServiceError('Revisa el nombre y la presentación del producto.')
    }
    const { data, error } = await getSupabase().from('catalog_products')
      .update({ product_name: name, quantity: presentation })
      .eq('code', code)
      .select('code, product_name, quantity').single()
    throwIfError(error, 'No fue posible corregir el catálogo compartido.')
    return mapCatalogProduct(data!)
  },
  async getStatus(): Promise<{ ready: boolean; count: number }> {
    const { count, error } = await getSupabase().from('catalog_products').select('code', { count: 'exact', head: true })
    if (isMissingCatalog(error?.code)) return { ready: false, count: 0 }
    throwIfError(error, 'No fue posible comprobar el catálogo de Colombia.')
    return { ready: true, count: count ?? 0 }
  },

  async search(query: string): Promise<CatalogProduct[]> {
    const normalized = query.trim()
    if (normalized.length < 2) return []
    if (normalized.length > 80) throw new ServiceError('La búsqueda debe tener máximo 80 caracteres.')

    const escaped = normalized.replace(/[\\%_]/g, '\\$&')
    const request = getSupabase().from('catalog_products').select('code, product_name, quantity')
    const { data, error } = await (/^\d{4,32}$/.test(normalized)
      ? request.eq('code', normalized)
      : request.ilike('product_name', `%${escaped}%`).order('product_name').limit(20))
    if (isMissingCatalog(error?.code)) return []
    throwIfError(error, 'No fue posible buscar en el catálogo de Colombia.')
    return (data ?? []).map(mapCatalogProduct)
  },

  async getByCode(code: string): Promise<CatalogProduct | null> {
    const { data, error } = await getSupabase()
      .from('catalog_products')
      .select('code, product_name, quantity')
      .eq('code', code)
      .maybeSingle()
    if (isMissingCatalog(error?.code)) return null
    throwIfError(error, 'No fue posible consultar el código de barras.')
    return data ? mapCatalogProduct(data) : null
  },
}
