import type { PresentationUnit } from '../types/domain'

export type ParsedPresentation = { presentationQuantity: number; presentationUnit: PresentationUnit }

export function isBarcode(value: string): boolean {
  return /^\d{4,32}$/.test(value)
}

export function parsePresentation(raw: string | null): ParsedPresentation | null {
  if (!raw) return null
  const match = raw.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:[x×*]\s*(\d+(?:[.,]\d+)?)\s*)?(kg|kilos?|kilogramos?|g|gr|gramos?|ml|l|litros?|unidades?|uds?|piezas?)\.?$/i)
  if (!match) return null

  const first = Number(match[1].replace(',', '.'))
  const second = match[2] ? Number(match[2].replace(',', '.')) : 1
  const quantity = Math.round(first * second * 1000) / 1000
  if (!Number.isFinite(quantity) || quantity <= 0) return null

  const unit = match[3].toLowerCase()
  const presentationUnit: PresentationUnit = unit.startsWith('k') ? 'kg'
    : unit.startsWith('g') ? 'g'
      : unit === 'ml' ? 'ml'
        : unit.startsWith('l') ? 'L' : 'unidades'

  return { presentationQuantity: quantity, presentationUnit }
}
