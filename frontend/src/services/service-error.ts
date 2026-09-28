import type { PostgrestError } from '@supabase/supabase-js'

export class ServiceError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}

export function throwIfError(error: PostgrestError | null, fallback: string): void {
  if (!error) return

  if (error.code === '23505') {
    throw new ServiceError('Ya existe un registro con esos datos.', error.code)
  }

  if (error.code === '23503') {
    throw new ServiceError('Este registro está siendo utilizado y no se puede eliminar.', error.code)
  }

  if (error.code === '42501') {
    throw new ServiceError('No tienes permiso para realizar esta acción.', error.code)
  }

  throw new ServiceError(fallback, error.code)
}
