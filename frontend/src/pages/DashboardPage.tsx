import { ArrowRight, CalendarDays, CircleDollarSign, PackageSearch, ShoppingBasket, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/AsyncState'
import { useAsyncValue } from '../hooks/useAsyncValue'
import { productsService } from '../services/products.service'
import { shoppingTripsService } from '../services/shopping-trips.service'
import { storesService } from '../services/stores.service'
import { formatCurrency, formatDate } from '../utils/format'
import { SquirrelMark } from '../components/SquirrelMark'

const dashboardLoadedAt = Date.now()

export function DashboardPage() {
  const dashboard = useAsyncValue(async () => {
    const [trips, products, stores, current] = await Promise.all([
      shoppingTripsService.listCompleted(),
      productsService.list(),
      storesService.list(),
      shoppingTripsService.getCurrent(),
    ])
    return { trips, products, stores, current }
  }, [])

  if (dashboard.loading) return <PageLoader />
  if (dashboard.error || !dashboard.value) return <ErrorState message={dashboard.error} onRetry={() => void dashboard.reload()} />

  const { trips, products, stores, current } = dashboard.value
  const lastTrip = trips[0]
  const recentSpending = trips
    .filter((trip) => dashboardLoadedAt - new Date(`${trip.shoppingDate}T00:00:00`).getTime() <= 30 * 86_400_000)
    .reduce((total, trip) => total + trip.total, 0)
  const usedStores = new Set(trips.map((trip) => trip.storeId)).size

  return (
    <div className="page-stack dashboard-page">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">Panel personal</p>
          <h1>Compra mejor.<br /><span>Recuerda todo.</span></h1>
          <p>Convierte cada recorrido por el supermercado en decisiones más claras para el siguiente.</p>
          <Link className="primary-button hero-action" to="/shop">
            <ShoppingBasket size={19} />
            {current ? 'Continuar mercado' : 'Nuevo mercado'}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="orbit-visual" aria-hidden="true">
          <div className="orbit orbit--outer"><span /></div>
          <div className="orbit orbit--inner"><span /></div>
          <div className="orbit-core"><SquirrelMark size={48} /></div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Resumen">
        <article className="metric-card metric-card--accent">
          <CircleDollarSign size={20} />
          <span>Gasto últimos 30 días</span>
          <strong>{formatCurrency(recentSpending)}</strong>
          <small>{trips.length ? 'Calculado desde tus compras' : 'Aún sin compras finalizadas'}</small>
        </article>
        <article className="metric-card">
          <PackageSearch size={20} />
          <span>Catálogo activo</span>
          <strong>{products.length}</strong>
          <small>productos reutilizables</small>
        </article>
        <article className="metric-card">
          <Store size={20} />
          <span>Tiendas visitadas</span>
          <strong>{usedStores}</strong>
          <small>de {stores.length} disponibles</small>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Pulso reciente</p><h2>Última compra</h2></div>
          <Link className="text-link" to="/history">Ver historial <ArrowRight size={16} /></Link>
        </div>
        {lastTrip ? (
          <Link className="recent-trip-card" to={`/history/${lastTrip.id}`}>
            <div className="date-glyph"><CalendarDays size={22} /></div>
            <div><strong>{lastTrip.storeName}</strong><span>{formatDate(lastTrip.shoppingDate)} · {lastTrip.productCount} unidades</span></div>
            <strong className="trip-amount">{formatCurrency(lastTrip.total)}</strong>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <div className="empty-card"><p>Tu primera compra aparecerá aquí.</p><span>Empieza un mercado para construir tu histórico.</span></div>
        )}
      </section>
    </div>
  )
}
