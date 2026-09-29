import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogService } from './catalog.service'

const insert = vi.hoisted(() => vi.fn())
const getSupabase = vi.hoisted(() => vi.fn(() => ({ from: () => ({ insert }) })))
vi.mock('../lib/supabase', () => ({ getSupabase }))

afterEach(() => {
  vi.unstubAllGlobals()
  insert.mockReset()
  getSupabase.mockClear()
})

describe('Open Food Facts barcode fallback', () => {
  it('keeps an API result available independently of shared-catalog permissions', async () => {
    const code = '7622201735432'
    const product = { code, product_name: 'Trident Sabor Artificial Fresa', quantity: '35 porciones/chicles 45,5 gramos' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 1, product }) }))

    await expect(catalogService.getFromOpenFoodFacts(code)).resolves.toEqual({
      code, productName: product.product_name, quantity: product.quantity,
    })
    expect(getSupabase).not.toHaveBeenCalled()
  })

  it('saves the resolved product when shared-catalog writes are available', async () => {
    const code = '7622201735432'
    const product = { code, product_name: 'Trident Sabor Artificial Fresa', quantity: '35 porciones/chicles 45,5 gramos' }
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: product, error: null }) }) })

    await expect(catalogService.add(code, product.product_name, product.quantity)).resolves.toEqual({
      code, productName: product.product_name, quantity: product.quantity,
    })
    expect(insert).toHaveBeenCalledWith({ code, product_name: product.product_name, quantity: product.quantity })
  })

  it('does not save a code absent from the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 0 }) }))
    await expect(catalogService.getFromOpenFoodFacts('7622201735432')).resolves.toBeNull()
    expect(insert).not.toHaveBeenCalled()
  })

  it('leaves manual entry available when the API has no name', async () => {
    const code = '7622201735432'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 1, product: { code, quantity: '45 g' } }) }))
    await expect(catalogService.getFromOpenFoodFacts(code)).resolves.toBeNull()
    expect(insert).not.toHaveBeenCalled()
  })

  it('reports an API connection failure without touching Supabase', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(catalogService.getFromOpenFoodFacts('7622201735432')).rejects.toThrow('No pudimos conectar')
    expect(getSupabase).not.toHaveBeenCalled()
  })

  it('rejects a malformed code before contacting the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(catalogService.getFromOpenFoodFacts('7622/../')).rejects.toThrow('inválido')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
