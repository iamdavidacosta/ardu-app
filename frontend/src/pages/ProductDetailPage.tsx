import { ArrowLeft, ArrowUpRight, MapPin, Power, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { PriceChart } from '../components/PriceChart'
import { useAsyncValue } from '../hooks/useAsyncValue'
import { historyService } from '../services/history.service'
import { productsService } from '../services/products.service'
import { formatCurrency, formatDate, formatPresentation } from '../utils/format'

export function ProductDetailPage() {
  const { id = '' } = useParams()
  const [actionError, setActionError] = useState('')
  const detail = useAsyncValue(() => historyService.getProductDetail(id), [id])
  if (detail.loading) return <PageLoader label="Leyendo el histórico…" />
  if (detail.error || !detail.value) return <ErrorState message={detail.error} onRetry={() => void detail.reload()} />

  const { product, priceHistory, lastPricesByStore } = detail.value
  async function toggleProduct() {
    setActionError('')
    try {
      await productsService.update(product.id, { ...product, active: !product.active })
      await detail.reload()
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'No fue posible actualizar el producto.')
    }
  }

  return (
    <div className="page-stack detail-page">
      <Link className="back-link" to="/products"><ArrowLeft size={17} /> Productos</Link>
      <header className="product-detail-hero">
        <div className="product-monogram large">{product.name.slice(0, 2).toUpperCase()}</div>
        <div className="product-title"><p className="eyebrow">Histórico personal</p><h1>{product.name}</h1><p>{formatPresentation(product.presentationQuantity, product.presentationUnit)}{product.category ? ` · ${product.category}` : ''}</p></div>
        <button className="status-button" type="button" onClick={() => void toggleProduct()}><Power size={16} /> {product.active ? 'Activo' : 'Inactivo'}</button>
      </header>
      {actionError && <div className="inline-error" role="alert">{actionError}<button type="button" onClick={() => setActionError('')}>Cerrar</button></div>}

      <section className="metric-grid price-metrics">
        <article className="metric-card metric-card--accent"><ArrowUpRight size={19} /><span>Último registrado</span><strong>{detail.value.lastPrice === null ? '—' : formatCurrency(detail.value.lastPrice)}</strong></article>
        <article className="metric-card"><TrendingDown size={19} /><span>Precio más bajo</span><strong>{detail.value.lowestPrice === null ? '—' : formatCurrency(detail.value.lowestPrice)}</strong></article>
        <article className="metric-card"><TrendingUp size={19} /><span>Precio más alto</span><strong>{detail.value.highestPrice === null ? '—' : formatCurrency(detail.value.highestPrice)}</strong></article>
      </section>

      {priceHistory.length >= 2 && <PriceChart history={priceHistory} />}

      <div className="detail-columns">
        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">Comparación</p><h2>Por tienda</h2></div><MapPin size={21} /></div>
          {lastPricesByStore.length === 0 ? <div className="empty-card"><p>Sin precios todavía.</p><span>Finaliza una compra con este producto para empezar.</span></div> : (
            <div className="list-stack">{lastPricesByStore.map((entry) => <article className="price-row" key={entry.storeId}><div><strong>{entry.storeName}</strong><span>Último registrado · {formatDate(entry.lastDate)}</span></div><strong>{formatCurrency(entry.lastUnitPrice)}</strong></article>)}</div>
          )}
        </section>
        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">Cronología</p><h2>Precios pagados</h2></div></div>
          {priceHistory.length === 0 ? <div className="empty-card"><p>Este producto aún no tiene histórico.</p></div> : (
            <div className="timeline">{priceHistory.map((entry, index) => <article className="timeline-entry" key={entry.shoppingTripId}><span className={index === 0 ? 'timeline-dot active' : 'timeline-dot'} /><div><strong>{entry.storeName}</strong><span>{formatDate(entry.shoppingDate)}</span></div><strong>{formatCurrency(entry.unitPrice)}</strong></article>)}</div>
          )}
        </section>
      </div>
    </div>
  )
}
