import { describe, expect, it } from 'vitest'
import { isBarcode, parsePresentation } from './barcode'

describe('barcode catalog input', () => {
  it('keeps leading zeroes in barcodes and rejects nonnumeric input', () => {
    expect(isBarcode('007702047038772')).toBe(true)
    expect(isBarcode('77020ABC')).toBe(false)
  })

  it('parses common Colombian package quantities', () => {
    expect(parsePresentation('380g')).toEqual({ presentationQuantity: 380, presentationUnit: 'g' })
    expect(parsePresentation('500 mL')).toEqual({ presentationQuantity: 500, presentationUnit: 'ml' })
    expect(parsePresentation('1,5 L')).toEqual({ presentationQuantity: 1.5, presentationUnit: 'L' })
    expect(parsePresentation('6 x 200 ml')).toEqual({ presentationQuantity: 1200, presentationUnit: 'ml' })
    expect(parsePresentation('35 porciones/chicles 45,5 gramos')).toEqual({ presentationQuantity: 45.5, presentationUnit: 'g' })
  })

  it('requires confirmation when quantity is missing or ambiguous', () => {
    expect(parsePresentation(null)).toBeNull()
    expect(parsePresentation('paquete grande')).toBeNull()
  })
})
