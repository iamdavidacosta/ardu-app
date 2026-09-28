import { describe, expect, it } from 'vitest'
import { formatCurrency, formatPresentation } from './format'

describe('formatters', () => {
  it('formats COP values without decimals', () => {
    expect(formatCurrency(12_500)).toBe('$ 12.500')
  })

  it('keeps presentation and purchased quantity as separate concepts', () => {
    expect(formatPresentation(1, 'kg')).toBe('1 kg')
    expect(formatPresentation(0.5, 'L')).toBe('0,5 L')
  })
})
