import { Plus, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { ProductForm } from '../components/ProductForm'
import { CatalogEditor } from '../components/CatalogEditor'
import { useAsyncValue } from '../hooks/useAsyncValue'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { catalogService } from '../services/catalog.service'
import { productsService } from '../services/products.service'
import type { CatalogProduct } from '../types/domain'
import { parsePresentation } from '../utils/barcode'
import { formatPresentation } from '../utils/format'

export function ProductsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogProduct | null>(null)
  const [editingCatalog, setEditingCatalog] = useState<CatalogProduct | null>(null)
  const [addingCode, setAddingCode] = useState('')
  const [actionError, setActionError] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const products = useAsyncValue(() => productsService.list(debouncedQuery), [debouncedQuery])
  const catalog = useAsyncValue(() => catalogService.search(debouncedQuery), [debouncedQuery])
  const catalogStatus = useAsyncValue(() => catalogService.getStatus(), [])
  let catalogStatusMessage = ''
  if (catalogStatus.value) {
    if (!catalogStatus.value.ready) catalogStatusMessage = 'El catálogo de Colombia aún no está activado en Supabase.'
    else if (catalogStatus.value.count === 0) catalogStatusMessage = 'El catálogo está vacío; falta cargar los productos en Supabase.'
    else catalogStatusMessage = `${catalogStatus.value.count.toLocaleString('es-CO')} productos disponibles en el catálogo compartido.`
  }

  async function addCatalogProduct(entry: CatalogProduct) {
    if (!session) return
    setAddingCode(entry.code)
    setActionError('')
    try {
      const product = await productsService.ensureFromCatalog(session.user.id, entry)
      if (product) navigate(`/products/${product.id}`)
      else {
        setSelectedCatalog(entry)
        setCreating(true)
      }
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'No fue posible añadir el producto.')
    } finally {
      setAddingCode('')
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--action">
        <div><p className="eyebrow">Tu memoria reutilizable</p><h1>Productos</h1><p>Busca una vez; úsalo en cada mercado.</p></div>
        <button className="secondary-button" type="button" onClick={() => { setSelectedCatalog(null); setCreating(true) }}><Plus size={18} /> Crear</button>
      </header>
      <label className="search-field">
        <Search size={19} />
        <span className="sr-only">Buscar productos</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o código…" />
      </label>
      {catalogStatus.value && <p className={catalogStatus.value.ready && catalogStatus.value.count > 0 ? 'catalog-status' : 'form-error'} role="status">{catalogStatusMessage}</p>}
      {catalogStatus.error && <p className="form-error" role="alert">{catalogStatus.error}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      {products.loading && <PageLoader label="Buscando productos…" />}
      {products.error && <ErrorState message={products.error} onRetry={() => void products.reload()} />}
      {catalog.error && query.length >= 2 && <ErrorState message={catalog.error} onRetry={() => void catalog.reload()} />}
      {products.value && products.value.length === 0 && (!query || (!catalog.loading && catalog.value?.length === 0)) && (
        <div className="empty-card large"><Sparkles size={28} /><h2>{query ? 'Sin coincidencias' : 'Crea tu primer producto'}</h2><p>{query ? 'Puedes registrarlo sin abandonar tu búsqueda.' : 'Tu catálogo crecerá automáticamente con cada compra.'}</p><button className="text-button" type="button" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo producto</button></div>
      )}
      {products.value && products.value.length > 0 && (
        <div className="product-grid" aria-label="Mis productos">
          {products.value.map((product) => (
            <Link className="product-card" to={`/products/${product.id}`} key={product.id}>
              <span className="product-monogram">{product.name.slice(0, 2).toUpperCase()}</span>
              <div><strong>{product.name}</strong><span>{formatPresentation(product.presentationQuantity, product.presentationUnit)}</span>{product.category && <small>{product.category}</small>}</div>
            </Link>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && catalog.value && catalog.value.length > 0 && <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Open Food Facts</p><h2>Catálogo compartido</h2></div></div><div className="product-grid">{catalog.value.map((entry) => <div className="catalog-entry" key={entry.code}><button className="product-card catalog-card" type="button" disabled={addingCode === entry.code || Boolean(products.value?.some((product) => product.barcode === entry.code))} onClick={() => void addCatalogProduct(entry)}><span className="product-monogram">{(entry.productName || 'CO').slice(0, 2).toUpperCase()}</span><span className="catalog-card-copy"><strong>{entry.productName || `Código ${entry.code}`}</strong><small>{entry.quantity || 'Presentación por confirmar'}</small></span><Plus size={18} /></button><button className="text-button catalog-edit-button" type="button" onClick={() => setEditingCatalog(entry)}>Corregir datos</button></div>)}</div><p className="source-credit">Datos de <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a> (ODbL). Las correcciones son compartidas.</p></section>}

      {editingCatalog && <CatalogEditor product={editingCatalog} onClose={() => setEditingCatalog(null)} onSaved={() => { setEditingCatalog(null); void catalog.reload() }} />}

      {creating && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreating(false); setSelectedCatalog(null) } }}>
          <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label="Crear producto">
            <ProductForm initialName={selectedCatalog?.productName || query} initialBarcode={selectedCatalog?.code} initialQuantity={parsePresentation(selectedCatalog?.quantity ?? null)?.presentationQuantity} initialUnit={parsePresentation(selectedCatalog?.quantity ?? null)?.presentationUnit} onCancel={() => { setCreating(false); setSelectedCatalog(null) }} onSaved={(product) => { setCreating(false); setSelectedCatalog(null); setQuery(''); if (selectedCatalog) navigate(`/products/${product.id}`); else void products.reload() }} />
          </div>
        </div>
      )}
    </div>
  )
}
