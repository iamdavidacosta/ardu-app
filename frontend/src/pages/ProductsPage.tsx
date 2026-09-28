import { Plus, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { ProductForm } from '../components/ProductForm'
import { useAsyncValue } from '../hooks/useAsyncValue'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { productsService } from '../services/products.service'
import { formatPresentation } from '../utils/format'

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const debouncedQuery = useDebouncedValue(query)
  const products = useAsyncValue(() => productsService.list(debouncedQuery), [debouncedQuery])

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--action">
        <div><p className="eyebrow">Tu memoria reutilizable</p><h1>Productos</h1><p>Busca una vez; úsalo en cada mercado.</p></div>
        <button className="secondary-button" type="button" onClick={() => setCreating(true)}><Plus size={18} /> Crear</button>
      </header>
      <label className="search-field">
        <Search size={19} />
        <span className="sr-only">Buscar productos</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre…" />
      </label>

      {products.loading && <PageLoader label="Buscando productos…" />}
      {products.error && <ErrorState message={products.error} onRetry={() => void products.reload()} />}
      {products.value && products.value.length === 0 && (
        <div className="empty-card large"><Sparkles size={28} /><h2>{query ? 'Sin coincidencias' : 'Crea tu primer producto'}</h2><p>{query ? 'Puedes registrarlo sin abandonar tu búsqueda.' : 'Tu catálogo crecerá automáticamente con cada compra.'}</p><button className="text-button" type="button" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo producto</button></div>
      )}
      {products.value && products.value.length > 0 && (
        <div className="product-grid">
          {products.value.map((product) => (
            <Link className="product-card" to={`/products/${product.id}`} key={product.id}>
              <span className="product-monogram">{product.name.slice(0, 2).toUpperCase()}</span>
              <div><strong>{product.name}</strong><span>{formatPresentation(product.presentationQuantity, product.presentationUnit)}</span>{product.category && <small>{product.category}</small>}</div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreating(false)}>
          <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label="Crear producto">
            <ProductForm initialName={query} onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); setQuery(''); void products.reload() }} />
          </div>
        </div>
      )}
    </div>
  )
}
