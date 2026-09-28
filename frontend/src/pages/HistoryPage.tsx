import { ArrowRight, CalendarDays, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { useAsyncValue } from '../hooks/useAsyncValue'
import { shoppingTripsService } from '../services/shopping-trips.service'
import { formatCurrency, formatDate } from '../utils/format'

export function HistoryPage() {
  const history = useAsyncValue(() => shoppingTripsService.listCompleted(), [])
  if (history.loading) return <PageLoader label="Reconstruyendo tu historial…" />
  if (history.error || !history.value) return <ErrorState message={history.error} onRetry={() => void history.reload()} />

  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Memoria de compra</p>
        <h1>Historial</h1>
        <p>Un registro permanente de lo que pagaste, dónde y cuándo.</p>
      </header>
      {history.value.length === 0 ? (
        <div className="empty-card large"><History size={30} /><h2>Aún no hay compras</h2><p>Cuando finalices tu primer mercado aparecerá aquí.</p></div>
      ) : (
        <div className="list-stack">
          {history.value.map((trip) => (
            <Link className="history-card" to={`/history/${trip.id}`} key={trip.id}>
              <div className="date-glyph"><CalendarDays size={21} /></div>
              <div className="history-card-main">
                <strong>{trip.storeName}</strong>
                <span>{formatDate(trip.shoppingDate)} · {trip.productCount} unidades</span>
              </div>
              <strong className="trip-amount">{formatCurrency(trip.total)}</strong>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
