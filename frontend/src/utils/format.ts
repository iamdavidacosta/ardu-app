import type { PresentationUnit } from '../types/domain'

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatCurrency(value: number): string {
  return copFormatter.format(value).replace(/\u00a0/g, ' ')
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`)).replace('.', '')
}

export function formatPresentation(quantity: number, unit: PresentationUnit): string {
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(quantity)} ${unit}`
}

export function todayLocalIso(): string {
  const today = new Date()
  const offset = today.getTimezoneOffset() * 60_000
  return new Date(today.getTime() - offset).toISOString().slice(0, 10)
}
