import type { ShoppingTrip } from '../types/domain'

const backupKey = 'mercado.current-trip-backup'

export function saveDraftBackup(trip: ShoppingTrip): void {
  if (trip.status !== 'draft') return
  localStorage.setItem(backupKey, JSON.stringify({ savedAt: Date.now(), trip }))
}

export function loadDraftBackup(tripId: string): ShoppingTrip | null {
  const stored = localStorage.getItem(backupKey)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored) as { trip?: ShoppingTrip }
    return parsed.trip?.id === tripId ? parsed.trip : null
  } catch {
    localStorage.removeItem(backupKey)
    return null
  }
}

export function clearDraftBackup(): void {
  localStorage.removeItem(backupKey)
}
