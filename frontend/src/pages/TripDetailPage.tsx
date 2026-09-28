import { ArrowLeft, ReceiptText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { useAsyncValue } from '../hooks/useAsyncValue'
import { shoppingTripsService } from '../services/shopping-trips.service'
import { formatCurrency, formatDate, formatPresentation } from '../utils/format'

export function TripDetailPage() {
  const { id = '' } = useParams()
  const trip = useAsyncValue(() => shoppingTripsService.get(id), [id])
  if (trip.loading) return <PageLoader label="Abriendo la compra…" />
  if (trip.error || !trip.value) return <ErrorState message={trip.error} onRetry={() => void trip.reload()} />

  return (
    <div className="page-stack detail-page">
      <Link className="back-link" to="/history"><ArrowLeft size={17} /> Historial</Link>
      <header className="detail-hero compact">
        <div><p className="eyebrow">Compra finalizada</p><h1>{trip.value.storeName}</h1><p>{formatDate(trip.value.shoppingDate)}</p></div>
        <div className="total-orb"><span>Total</span><strong>{formatCurrency(trip.value.total)}</strong></div>
      </header>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Detalle</p><h2>Productos</h2></div><ReceiptText size={22} /></div>
        <div className="list-stack">
          {trip.value.items.map((item) => (
            <article className="receipt-row" key={item.id}>
              <div><strong>{item.productName}</strong><span>{formatPresentation(item.presentationQuantity, item.presentationUnit)} · {item.quantityPurchased} × {formatCurrency(item.unitPrice)}</span></div>
              <strong>{formatCurrency(item.subtotal)}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
