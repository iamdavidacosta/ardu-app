export function calculateSubtotal(unitPrice: number, quantityPurchased: number): number {
  return unitPrice * quantityPurchased
}

export function calculateTotal(items: ReadonlyArray<{ unitPrice: number; quantityPurchased: number }>): number {
  return items.reduce((total, item) => total + calculateSubtotal(item.unitPrice, item.quantityPurchased), 0)
}
