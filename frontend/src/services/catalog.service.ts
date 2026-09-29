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
    const { data, error } = await getSupabase()
      .from('catalog_products')
      .select('code, product_name, quantity')
      .ilike('product_name', `%${escaped}%`)
      .order('product_name')
      .limit(20)
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
