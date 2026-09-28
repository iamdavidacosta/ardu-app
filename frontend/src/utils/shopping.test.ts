import { describe, expect, it } from 'vitest'
import { calculateSubtotal, calculateTotal } from './shopping'

describe('shopping calculations', () => {
  it('updates subtotals and the accumulated total', () => {
    expect(calculateSubtotal(4_500, 2)).toBe(9_000)
    expect(calculateTotal([
      { unitPrice: 4_500, quantityPurchased: 2 },
      { unitPrice: 4_200, quantityPurchased: 3 },
    ])).toBe(21_600)
  })
})
