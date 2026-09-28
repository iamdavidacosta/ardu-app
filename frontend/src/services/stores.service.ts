import { getSupabase } from '../lib/supabase'
import type { Store } from '../types/domain'
import { throwIfError } from './service-error'

export const storesService = {
  async ensureInitialStores(): Promise<void> {
    const { error } = await getSupabase().rpc('ensure_initial_stores')
    throwIfError(error, 'No fue posible preparar las tiendas iniciales.')
  },

  async list(): Promise<Store[]> {
    const { data, error } = await getSupabase().from('stores').select('id, name').order('name')
    throwIfError(error, 'No fue posible cargar las tiendas.')
    return (data ?? []).map((store) => ({ id: store.id, name: store.name }))
  },

  async create(userId: string, name: string): Promise<Store> {
    const { data, error } = await getSupabase()
      .from('stores')
      .insert({ user_id: userId, name: name.trim() })
      .select('id, name')
      .single()
    throwIfError(error, 'No fue posible crear la tienda.')
    return { id: data!.id, name: data!.name }
  },
}
