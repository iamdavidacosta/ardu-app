import { useCallback, useEffect, useState, type DependencyList } from 'react'

export type AsyncValue<T> = {
  value: T | null
  loading: boolean
  error: string
  reload: () => Promise<void>
}

export function useAsyncValue<T>(loader: () => Promise<T>, dependencies: DependencyList): AsyncValue<T> {
  const [value, setValue] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setValue(await loader())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  useEffect(() => {
    void reload()
  }, [reload])

  return { value, loading, error, reload }
}
