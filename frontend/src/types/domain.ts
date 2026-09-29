export type PresentationUnit = 'g' | 'kg' | 'ml' | 'L' | 'unidades'

export type Store = {
  id: string
  name: string
}

export type Product = {
  id: string
  barcode: string | null
  name: string
  presentationQuantity: number
  presentationUnit: PresentationUnit
  category: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type SaveProductInput = Omit<Product, 'id' | 'barcode' | 'createdAt' | 'updatedAt'> & { barcode?: string | null }

export type CatalogProduct = {
  code: string
  productName: string | null
  quantity: string | null
}

export type ShoppingItem = {
  id: string
  productId: string
  productName: string
  presentationQuantity: number
  presentationUnit: PresentationUnit
  unitPrice: number
  quantityPurchased: number
  subtotal: number
}

export type ShoppingTrip = {
  id: string
  storeId: string
  storeName: string
  shoppingDate: string
  status: 'draft' | 'completed'
  total: number
  items: ShoppingItem[]
}

export type ShoppingTripSummary = {
  id: string
  storeId: string
  storeName: string
  shoppingDate: string
  total: number
  productCount: number
}

export type PriceHistoryEntry = {
  shoppingTripId: string
  storeId: string
  storeName: string
  shoppingDate: string
  unitPrice: number
}

export type StorePrice = {
  storeId: string
  storeName: string
  lastUnitPrice: number
  lastDate: string
}

export type ProductDetail = {
  product: Product
  lastPrice: number | null
  lowestPrice: number | null
  highestPrice: number | null
  priceHistory: PriceHistoryEntry[]
  lastPricesByStore: StorePrice[]
}
