import { beforeEach, describe, expect, it } from 'vitest'
import type { ShoppingTrip } from '../types/domain'
import { clearDraftBackup, loadDraftBackup, saveDraftBackup } from './draft-backup'

const trip: ShoppingTrip = {
  id: 'trip-1',
  storeId: 'store-1',
  storeName: 'D1',
  shoppingDate: '2026-09-28',
  status: 'draft',
  total: 9_000,
  items: [{
    id: 'item-1',
    productId: 'product-1',
    productName: 'Arroz Diana',
    presentationQuantity: 1,
    presentationUnit: 'kg',
    unitPrice: 4_500,
    quantityPurchased: 2,
    subtotal: 9_000,
  }],
}

describe('draft backup', () => {
  beforeEach(() => localStorage.clear())

  it('restores only the matching draft and can remove local data', () => {
    saveDraftBackup(trip)
    expect(loadDraftBackup('trip-1')).toEqual(trip)
    expect(loadDraftBackup('another-trip')).toBeNull()
    clearDraftBackup()
    expect(loadDraftBackup('trip-1')).toBeNull()
  })

  it('does not retain completed purchases', () => {
    saveDraftBackup({ ...trip, status: 'completed' })
    expect(loadDraftBackup('trip-1')).toBeNull()
  })
})
