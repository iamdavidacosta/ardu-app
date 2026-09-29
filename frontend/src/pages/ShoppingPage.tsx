import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Minus, Plus, ScanLine, Search, ShoppingBasket, Sparkles, Store, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { ProductForm } from '../components/ProductForm'
import { SheetPortal } from '../components/SheetPortal'
import { clearDraftBackup, loadDraftBackup, saveDraftBackup } from '../lib/draft-backup'
import { catalogService } from '../services/catalog.service'
import { productsService } from '../services/products.service'
import { shoppingTripsService } from '../services/shopping-trips.service'
import { storesService } from '../services/stores.service'
import type { CatalogProduct, Product, ShoppingItem, ShoppingTrip, Store as StoreType } from '../types/domain'
import { parsePresentation } from '../utils/barcode'
import { formatCurrency, formatDate, formatPresentation, todayLocalIso } from '../utils/format'
import { calculateSubtotal, calculateTotal } from '../utils/shopping'

type PendingUpdate = { unitPrice: number; quantityPurchased: number }

function updateLocalItem(trip: ShoppingTrip, itemId: string, update: PendingUpdate): ShoppingTrip {
  const items = trip.items.map((item) => item.id === itemId ? {
    ...item,
    ...update,
    subtotal: calculateSubtotal(update.unitPrice, update.quantityPurchased),
  } : item)
  return { ...trip, items, total: calculateTotal(items) }
}

function overlayBackup(server: ShoppingTrip, backup: ShoppingTrip | null): ShoppingTrip {
  if (!backup) return server
  const savedItems = new Map(backup.items.map((item) => [item.id, item]))
  const items = server.items.map((item) => savedItems.has(item.id) ? { ...item, ...savedItems.get(item.id)! } : item)
  return { ...server, items, total: calculateTotal(items) }
}

export function ShoppingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [stores, setStores] = useState<StoreType[]>([])
  const [trip, setTrip] = useState<ShoppingTrip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [selectedStore, setSelectedStore] = useState('')
  const [shoppingDate, setShoppingDate] = useState(todayLocalIso())
  const [newStoreName, setNewStoreName] = useState('')
  const [showNewStore, setShowNewStore] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [resolvingCatalog, setResolvingCatalog] = useState(false)
  const [checkingScanner, setCheckingScanner] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const [pendingCatalog, setPendingCatalog] = useState<CatalogProduct | null>(null)
  const [pendingLookupMessage, setPendingLookupMessage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const timers = useRef(new Map<string, number>())
  const pendingUpdates = useRef(new Map<string, PendingUpdate>())
  const scanButtonRef = useRef<HTMLButtonElement>(null)
  const tripId = trip?.id
  const closeScanner = useCallback(() => { setScannerOpen(false); scanButtonRef.current?.focus() }, [])

  async function openScanner() {
    setCheckingScanner(true)
    setError('')
    try {
      if (!(await catalogService.getStatus()).ready) {
        setError('El lector estará disponible cuando se apliquen las migraciones del catálogo en Supabase.')
        return
      }
      setScannerOpen(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible preparar el lector.')
    } finally {
      setCheckingScanner(false)
    }
  }

  async function loadCurrent() {
    setLoading(true)
    setError('')
    try {
      const [availableStores, current] = await Promise.all([storesService.list(), shoppingTripsService.getCurrent()])
      setStores(availableStores)
      setSelectedStore(availableStores[0]?.id ?? '')
      if (current) {
        const merged = overlayBackup(current, loadDraftBackup(current.id))
        setTrip(merged)
        const changes = merged.items.filter((item) => {
          const serverItem = current.items.find((candidate) => candidate.id === item.id)
          return serverItem && (serverItem.unitPrice !== item.unitPrice || serverItem.quantityPurchased !== item.quantityPurchased)
        })
        if (changes.length) {
          setSaveState('saving')
          await Promise.all(changes.map((item) => shoppingTripsService.updateItem(current.id, item.id, item.unitPrice, item.quantityPurchased)))
          setSaveState('saved')
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible abrir la compra actual.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const activeTimers = timers.current
    const initialLoad = window.setTimeout(() => void loadCurrent(), 0)
    return () => {
      window.clearTimeout(initialLoad)
      activeTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (trip) saveDraftBackup(trip)
  }, [trip])

  useEffect(() => {
    if (!tripId || !query.trim() || selectedProduct) return
    let active = true
    const timer = window.setTimeout(() => {
      void Promise.allSettled([productsService.list(query), catalogService.search(query)])
        .then(([ownedResult, catalogResult]) => {
          if (!active) return
          const owned = ownedResult.status === 'fulfilled' ? ownedResult.value : []
          const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : []
          setResults(owned)
          setCatalogResults(catalog.filter((entry) => !owned.some((product) => product.barcode === entry.code)))
          const failure = ownedResult.status === 'rejected' ? ownedResult.reason
            : catalogResult.status === 'rejected' ? catalogResult.reason : null
          if (failure) setError(failure instanceof Error ? failure.message : 'No fue posible buscar productos.')
        })
        .finally(() => { if (active) setSearching(false) })
    }, 220)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, tripId, selectedProduct])

  function selectProduct(product: Product) {
    if (trip?.items.some((item) => item.productId === product.id)) {
      setError(`${product.name} ya está en el carrito. Ajusta la cantidad en su tarjeta.`)
      setSelectedProduct(null)
      setQuery('')
      setResults([])
      setCatalogResults([])
      return
    }
    setSelectedProduct(product)
    setQuery(product.name)
    setResults([])
    setCatalogResults([])
    setSearching(false)
  }

  async function chooseCatalog(catalog: CatalogProduct) {
    if (!session) return
    setResolvingCatalog(true)
    setError('')
    try {
      const product = await productsService.ensureFromCatalog(session.user.id, catalog)
      if (product) selectProduct(product)
      else {
        setPendingBarcode(catalog.code)
        setPendingCatalog(catalog)
        setCreatingProduct(true)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible seleccionar el producto del catálogo.')
    } finally {
      setResolvingCatalog(false)
    }
  }

  async function handleBarcode(code: string) {
    closeScanner()
    setResolvingCatalog(true)
    setError('')
    setPendingLookupMessage('')
    try {
      const owned = await productsService.getByBarcode(code)
      if (owned) {
        selectProduct(owned.active ? owned : await productsService.update(owned.id, { ...owned, active: true }))
        return
      }
      let catalog = await catalogService.getByCode(code)
      let sharedSaveError = ''
      if (!catalog) {
        let found: Awaited<ReturnType<typeof catalogService.getFromOpenFoodFacts>>
        try {
          found = await catalogService.getFromOpenFoodFacts(code)
        } catch (caught) {
          setPendingLookupMessage(caught instanceof Error ? caught.message : 'No fue posible consultar Open Food Facts; puedes ingresar el producto manualmente.')
          setPendingBarcode(code)
          setPendingCatalog(null)
          setCreatingProduct(true)
          return
        }
        catalog = found
        if (found) {
          try {
            catalog = await catalogService.add(code, found.productName, found.quantity)
          } catch {
            sharedSaveError = 'Encontramos el producto en Open Food Facts, pero no se guardó en el catálogo compartido. Puedes usarlo en esta compra; falta revisar los permisos de Supabase.'
          }
        }
      }
      if (catalog && session) {
        const product = await productsService.ensureFromCatalog(session.user.id, catalog)
        if (product) {
          selectProduct(product)
          if (sharedSaveError) setError(sharedSaveError)
          return
        }
      }
      setPendingBarcode(code)
      setPendingCatalog(catalog)
      setPendingLookupMessage(sharedSaveError || (catalog ? 'Confirma la presentación para continuar.' : 'No encontramos este código en Open Food Facts. Ingresa sus datos manualmente.'))
      setCreatingProduct(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible consultar el código de barras.')
    } finally {
      setResolvingCatalog(false)
    }
  }

  function finishManualProduct(product: Product) {
    const code = pendingBarcode
    setCreatingProduct(false)
    setPendingBarcode(null)
    setPendingCatalog(null)
    selectProduct(product)
    if (!code) return
    const quantity = formatPresentation(product.presentationQuantity, product.presentationUnit)
    const saveShared = catalogService.getByCode(code).then((existing) => existing
      ? catalogService.update(code, product.name, quantity)
      : catalogService.add(code, product.name, quantity))
    void saveShared.catch((caught) => setError(caught instanceof Error ? caught.message : 'El producto se guardó solo en tu catálogo personal.'))
  }

  async function startTrip() {
    if (!session || !selectedStore) return setError('Selecciona una tienda para continuar.')
    setLoading(true)
    setError('')
    try {
      setTrip(await shoppingTripsService.create(session.user.id, selectedStore, shoppingDate))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar la compra.')
    } finally {
      setLoading(false)
    }
  }

  async function createStore() {
    if (!session || !newStoreName.trim()) return
    try {
      const store = await storesService.create(session.user.id, newStoreName)
      setStores((current) => [...current, store].sort((left, right) => left.name.localeCompare(right.name)))
      setSelectedStore(store.id)
      setNewStoreName('')
      setShowNewStore(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible crear la tienda.')
    }
  }

  async function changeStore(storeId: string) {
    if (!trip) return
    const previous = trip
    const store = stores.find((candidate) => candidate.id === storeId)
    setTrip({ ...trip, storeId, storeName: store?.name ?? trip.storeName })
    try {
      setTrip(await shoppingTripsService.changeStore(trip.id, storeId))
    } catch (caught) {
      setTrip(previous)
      setError(caught instanceof Error ? caught.message : 'No fue posible cambiar la tienda.')
    }
  }

  function scheduleUpdate(itemId: string, update: PendingUpdate) {
    if (!trip) return
    setTrip(updateLocalItem(trip, itemId, update))
    pendingUpdates.current.set(itemId, update)
    setSaveState('saving')
    const existingTimer = timers.current.get(itemId)
    if (existingTimer) window.clearTimeout(existingTimer)
    const tripId = trip.id
    timers.current.set(itemId, window.setTimeout(() => {
      const pending = pendingUpdates.current.get(itemId)
      if (!pending) return
      void shoppingTripsService.updateItem(tripId, itemId, pending.unitPrice, pending.quantityPurchased)
        .then(() => {
          if (pendingUpdates.current.get(itemId) === pending) pendingUpdates.current.delete(itemId)
          if (pendingUpdates.current.size === 0) setSaveState('saved')
        })
        .catch((caught) => {
          setSaveState('error')
          setError(caught instanceof Error ? caught.message : 'No fue posible guardar un producto.')
        })
    }, 480))
  }

  async function flushPendingUpdates() {
    if (!trip || pendingUpdates.current.size === 0) return
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
    const updates = [...pendingUpdates.current.entries()]
    setSaveState('saving')
    await Promise.all(updates.map(([itemId, update]) => shoppingTripsService.updateItem(
      trip.id,
      itemId,
      update.unitPrice,
      update.quantityPurchased,
    )))
    pendingUpdates.current.clear()
    setSaveState('saved')
  }

  async function addSelectedProduct() {
    if (!session || !trip || !selectedProduct) return
    const unitPrice = Number(newItemPrice)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError('Ingresa un precio válido.')
    setSaveState('saving')
    setError('')
    try {
      setTrip(await shoppingTripsService.addItem(session.user.id, trip.id, selectedProduct.id, unitPrice, newItemQuantity))
      setSelectedProduct(null)
      setQuery('')
      setNewItemPrice('')
      setNewItemQuantity(1)
      setSaveState('saved')
    } catch (caught) {
      setSaveState('error')
      setError(caught instanceof Error ? caught.message : 'No fue posible agregar el producto.')
    }
  }

  async function deleteItem(itemId: string) {
    if (!trip) return
    const previous = trip
    const items = trip.items.filter((item) => item.id !== itemId)
    setTrip({ ...trip, items, total: calculateTotal(items) })
    try {
      setTrip(await shoppingTripsService.deleteItem(trip.id, itemId))
    } catch (caught) {
      setTrip(previous)
      setError(caught instanceof Error ? caught.message : 'No fue posible eliminar el producto.')
    }
  }

  async function finalizeTrip() {
    if (!trip || trip.items.length === 0) return setError('Agrega al menos un producto antes de finalizar.')
    setLoading(true)
    setError('')
    try {
      await flushPendingUpdates()
      const completed = await shoppingTripsService.finalize(trip.id)
      clearDraftBackup()
      navigate(`/history/${completed.id}`, { replace: true })
    } catch (caught) {
      setSaveState('error')
      setError(caught instanceof Error ? caught.message : 'No fue posible finalizar la compra.')
      setLoading(false)
    }
  }

  if (loading && !trip) return <PageLoader label="Recuperando tu compra…" />
  if (error && !trip && stores.length === 0) return <ErrorState message={error} onRetry={() => void loadCurrent()} />

  if (!trip) {
    return (
      <div className="page-stack start-trip-page">
        <header className="page-heading"><p className="eyebrow">Nueva expedición</p><h1>¿Dónde compras hoy?</h1><p>La tienda y la fecha organizan todo el histórico que construirás.</p></header>
        <section className="start-trip-card">
          <div className="start-trip-icon"><Store size={30} /></div>
          <label>Tienda<select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)}><option value="">Selecciona una tienda</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
          <label>Fecha<input type="date" value={shoppingDate} onChange={(event) => setShoppingDate(event.target.value)} /></label>
          {showNewStore ? <div className="inline-create"><input autoFocus value={newStoreName} onChange={(event) => setNewStoreName(event.target.value)} placeholder="Nombre de la tienda" maxLength={80} /><button type="button" className="text-button" onClick={() => void createStore()}><Check size={16} /> Guardar</button></div> : <button className="text-button align-start" type="button" onClick={() => setShowNewStore(true)}><Plus size={16} /> Agregar otra tienda</button>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="button" onClick={() => void startTrip()}><ShoppingBasket size={19} /> Empezar mercado</button>
        </section>
      </div>
    )
  }

  return (
    <div className="shopping-workspace">
      <header className="shopping-header">
        <div>
          <p className="eyebrow">Compra actual</p>
          <label className="store-select"><span className="sr-only">Tienda</span><select value={trip.storeId} onChange={(event) => void changeStore(event.target.value)}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select><ChevronDown size={18} /></label>
          <p>{formatDate(trip.shoppingDate)} · <span className={`save-state save-state--${saveState}`}>{saveState === 'saved' ? 'Guardado' : saveState === 'saving' ? 'Guardando…' : 'Revisa la conexión'}</span></p>
        </div>
        <div className="running-total"><span>Total</span><strong>{formatCurrency(trip.total)}</strong></div>
      </header>

      {error && <div className="inline-error" role="alert">{error}<button type="button" onClick={() => setError('')}>Cerrar</button></div>}

      <section className="add-product-panel">
        <div className="product-search-row">
          <label className="search-field large"><Search size={20} /><span className="sr-only">Buscar producto</span><input value={query} onChange={(event) => { const value = event.target.value; setQuery(value); setSelectedProduct(null); setResults([]); setCatalogResults([]); setSearching(Boolean(value.trim())) }} placeholder="Buscar producto…" autoComplete="off" /></label>
          <button ref={scanButtonRef} className="scanner-button" type="button" disabled={checkingScanner} onClick={() => void openScanner()} aria-label={checkingScanner ? 'Comprobando lector' : 'Escanear código de barras'}><ScanLine size={22} /><span>{checkingScanner ? 'Comprobando…' : 'Escanear'}</span></button>
        </div>
        {resolvingCatalog && <p className="search-hint" role="status">Consultando código de barras…</p>}
        {query && !selectedProduct && (
          <div className="search-results">
            {searching && <p className="search-hint">Buscando…</p>}
            {!searching && results.map((product) => {
              const alreadyAdded = trip.items.some((item) => item.productId === product.id)
              return <button type="button" key={product.id} disabled={alreadyAdded} onClick={() => selectProduct(product)}><span><strong>{product.name}</strong><small>{formatPresentation(product.presentationQuantity, product.presentationUnit)} · Mi catálogo</small></span><span>{alreadyAdded ? 'Agregado' : <Plus size={18} />}</span></button>
            })}
            {!searching && catalogResults.map((catalog) => <button type="button" key={catalog.code} disabled={resolvingCatalog} onClick={() => void chooseCatalog(catalog)}><span><strong>{catalog.productName || `Código ${catalog.code}`}</strong><small>{catalog.quantity || 'Presentación por confirmar'} · Open Food Facts</small></span><Plus size={18} /></button>)}
            {!searching && catalogResults.length > 0 && <p className="source-credit">Datos de <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a> (ODbL).</p>}
            {!searching && <button type="button" className="create-result" onClick={() => { setPendingBarcode(null); setPendingCatalog(null); setCreatingProduct(true) }}><Sparkles size={18} /><span><strong>Crear “{query}”</strong><small>Guardar en tu catálogo</small></span></button>}
          </div>
        )}
        {selectedProduct && (
          <div className="quick-add-card">
            <div><p className="eyebrow">Agregar a la compra</p><h2>{selectedProduct.name}</h2><span>{formatPresentation(selectedProduct.presentationQuantity, selectedProduct.presentationUnit)}</span></div>
            <div className="quick-add-fields">
              <label>Precio unitario<div className="money-input"><span>$</span><input autoFocus type="number" inputMode="numeric" min="0" step="1" value={newItemPrice} onChange={(event) => setNewItemPrice(event.target.value)} placeholder="4.500" /></div></label>
              <label>Cantidad<div className="stepper"><button type="button" onClick={() => setNewItemQuantity((value) => Math.max(1, value - 1))} aria-label="Disminuir cantidad"><Minus size={18} /></button><strong>{newItemQuantity}</strong><button type="button" onClick={() => setNewItemQuantity((value) => value + 1)} aria-label="Aumentar cantidad"><Plus size={18} /></button></div></label>
            </div>
            <div className="quick-add-footer"><span>Subtotal <strong>{formatCurrency((Number(newItemPrice) || 0) * newItemQuantity)}</strong></span><button className="primary-button compact" type="button" onClick={() => void addSelectedProduct()}><Plus size={18} /> Agregar</button></div>
          </div>
        )}
      </section>

      <section className="current-items">
        <div className="section-heading"><div><p className="eyebrow">En el carrito</p><h2>{trip.items.length} {trip.items.length === 1 ? 'producto' : 'productos'}</h2></div></div>
        {trip.items.length === 0 ? <div className="empty-card"><ShoppingBasket size={28} /><p>Tu compra está vacía.</p><span>Busca arriba para agregar el primer producto.</span></div> : (
          <div className="shopping-item-list">{trip.items.map((item) => <ShoppingItemCard key={item.id} item={item} onChange={(update) => scheduleUpdate(item.id, update)} onDelete={() => void deleteItem(item.id)} />)}</div>
        )}
      </section>

      <footer className="checkout-bar"><div><span>Total compra</span><strong>{formatCurrency(trip.total)}</strong></div><button className="primary-button" type="button" disabled={trip.items.length === 0 || loading} onClick={() => void finalizeTrip()}><Check size={19} /> {loading ? 'Finalizando…' : 'Finalizar compra'}</button></footer>

      {scannerOpen && <BarcodeScanner onDetected={(code) => void handleBarcode(code)} onClose={closeScanner} />}
      {creatingProduct && <SheetPortal><div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreatingProduct(false)}><div className="bottom-sheet" role="dialog" aria-modal="true" aria-label="Crear producto"><ProductForm initialName={pendingCatalog?.productName || (pendingBarcode ? '' : query)} initialBarcode={pendingBarcode ?? undefined} initialQuantity={parsePresentation(pendingCatalog?.quantity ?? null)?.presentationQuantity} initialUnit={parsePresentation(pendingCatalog?.quantity ?? null)?.presentationUnit} lookupMessage={pendingLookupMessage} onCancel={() => setCreatingProduct(false)} onSaved={finishManualProduct} /></div></div></SheetPortal>}
    </div>
  )
}

function ShoppingItemCard({ item, onChange, onDelete }: {
  item: ShoppingItem
  onChange: (update: PendingUpdate) => void
  onDelete: () => void
}) {
  return (
    <article className="shopping-item-card">
      <div className="item-identity"><span className="product-monogram small">{item.productName.slice(0, 2).toUpperCase()}</span><div><strong>{item.productName}</strong><span>{formatPresentation(item.presentationQuantity, item.presentationUnit)}</span></div><button className="icon-button danger" type="button" onClick={onDelete} aria-label={`Eliminar ${item.productName}`}><Trash2 size={18} /></button></div>
      <div className="item-controls">
        <label>Precio<div className="money-input"><span>$</span><input type="number" inputMode="numeric" min="0" step="1" value={item.unitPrice} onChange={(event) => onChange({ unitPrice: Math.max(0, Number(event.target.value)), quantityPurchased: item.quantityPurchased })} /></div></label>
        <label>Cantidad<div className="stepper"><button type="button" onClick={() => onChange({ unitPrice: item.unitPrice, quantityPurchased: Math.max(1, item.quantityPurchased - 1) })} disabled={item.quantityPurchased <= 1} aria-label={`Disminuir cantidad de ${item.productName}`}><Minus size={18} /></button><strong>{item.quantityPurchased}</strong><button type="button" onClick={() => onChange({ unitPrice: item.unitPrice, quantityPurchased: item.quantityPurchased + 1 })} aria-label={`Aumentar cantidad de ${item.productName}`}><Plus size={18} /></button></div></label>
      </div>
      <div className="item-subtotal"><span>Subtotal</span><strong>{formatCurrency(item.subtotal)}</strong></div>
    </article>
  )
}
