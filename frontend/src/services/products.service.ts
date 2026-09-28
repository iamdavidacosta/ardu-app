import { getSupabase } from '../lib/supabase'
import type { Database } from '../types/database'
import type { Product, SaveProductInput } from '../types/domain'
import { ServiceError, throwIfError } from './service-error'

type ProductRow = Database['public']['Tables']['products']['Row']

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
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

  async create(userId: string, input: SaveProductInput): Promise<Product> {
    const { data, error } = await getSupabase()
      .from('products')
      .insert({
        user_id: userId,
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
