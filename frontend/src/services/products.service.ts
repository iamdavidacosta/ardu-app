import { getSupabase } from '../lib/supabase'
import type { Database } from '../types/database'
import type { CatalogProduct, Product, SaveProductInput } from '../types/domain'
import { parsePresentation } from '../utils/barcode'
import { ServiceError, throwIfError } from './service-error'

type ProductRow = Database['public']['Tables']['products']['Row']

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    barcode: row.barcode ?? null,
    name: row.name,
    presentationQuantity: Number(row.presentation_quantity),
    presentationUnit: row.presentation_unit as Product['presentationUnit'],
    category: row.category,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const productsService = {
  async list(query = '', includeInactive = false): Promise<Product[]> {
    const normalizedQuery = query.trim()
    if (normalizedQuery.length > 80) {
      throw new ServiceError('La búsqueda debe tener máximo 80 caracteres.')
    }

    let request = getSupabase().from('products').select('*').order('name').limit(normalizedQuery ? 20 : 200)
    if (!includeInactive) request = request.eq('active', true)
    if (normalizedQuery) request = request.ilike('name', `%${normalizedQuery}%`)

    const { data, error } = await request
    throwIfError(error, 'No fue posible cargar los productos.')
    return (data ?? []).map(mapProduct)
  },

  async get(id: string): Promise<Product> {
    const { data, error } = await getSupabase().from('products').select('*').eq('id', id).single()
    throwIfError(error, 'No fue posible cargar el producto.')
    return mapProduct(data!)
  },

  async getByBarcode(code: string): Promise<Product | null> {
    const { data, error } = await getSupabase().from('products').select('*').eq('barcode', code).maybeSingle()
    throwIfError(error, 'No fue posible buscar el código de barras.')
    return data ? mapProduct(data) : null
  },

  async ensureFromCatalog(userId: string, catalog: CatalogProduct): Promise<Product | null> {
    const name = catalog.productName?.trim().slice(0, 120)
    const presentation = parsePresentation(catalog.quantity)
    if (!name || !presentation) return null

    const byBarcode = await this.getByBarcode(catalog.code)
    if (byBarcode) return byBarcode.active ? byBarcode : this.update(byBarcode.id, { ...byBarcode, active: true })

    const { data, error } = await getSupabase()
      .from('products')
      .select('*')
      .ilike('name', name.replace(/[\\%_]/g, '\\$&'))
      .eq('presentation_quantity', presentation.presentationQuantity)
      .eq('presentation_unit', presentation.presentationUnit)
      .maybeSingle()
    throwIfError(error, 'No fue posible revisar tus productos.')
    if (data) {
      const existing = mapProduct(data)
      return this.update(data.id, { ...existing, barcode: existing.barcode ?? catalog.code, active: true })
    }

    return this.create(userId, {
      name,
      ...presentation,
      barcode: catalog.code,
      category: null,
      active: true,
    })
  },

  async create(userId: string, input: SaveProductInput): Promise<Product> {
    const { data, error } = await getSupabase()
      .from('products')
      .insert({
        user_id: userId,
        ...(input.barcode ? { barcode: input.barcode } : {}),
        name: input.name.trim(),
        presentation_quantity: input.presentationQuantity,
        presentation_unit: input.presentationUnit,
        category: input.category?.trim() || null,
        active: input.active,
      })
      .select('*')
      .single()
    throwIfError(error, 'No fue posible crear el producto.')
    return mapProduct(data!)
  },

  async update(id: string, input: SaveProductInput): Promise<Product> {
    const { data, error } = await getSupabase()
      .from('products')
      .update({
        ...(input.barcode ? { barcode: input.barcode } : {}),
        name: input.name.trim(),
        presentation_quantity: input.presentationQuantity,
        presentation_unit: input.presentationUnit,
        category: input.category?.trim() || null,
        active: input.active,
      })
      .eq('id', id)
      .select('*')
      .single()
    throwIfError(error, 'No fue posible actualizar el producto.')
    return mapProduct(data!)
  },
}

export { mapProduct }
