import type { PriceHistoryEntry } from '../types/domain'
import { formatCurrency } from '../utils/format'

export function PriceChart({ history }: { history: PriceHistoryEntry[] }) {
  const ordered = [...history].reverse()
  if (ordered.length < 2) return null

  const width = 640
  const height = 210
  const padding = 28
  const prices = ordered.map((entry) => entry.unitPrice)
  const minimum = Math.min(...prices)
  const maximum = Math.max(...prices)
  const range = Math.max(maximum - minimum, 1)
  const points = ordered.map((entry, index) => ({
    x: padding + (index / (ordered.length - 1)) * (width - padding * 2),
    y: height - padding - ((entry.unitPrice - minimum) / range) * (height - padding * 2),
    entry,
  }))
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <figure className="price-chart">
      <div className="chart-labels"><span>{formatCurrency(maximum)}</span><span>{formatCurrency(minimum)}</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución del precio registrado">
        <defs>
          <linearGradient id="priceArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${points[0].x} ${height - padding} L ${polyline.replaceAll(',', ' ')} L ${points.at(-1)!.x} ${height - padding} Z`} fill="url(#priceArea)" />
        <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <circle key={`${point.entry.shoppingTripId}-${point.x}`} cx={point.x} cy={point.y} r="6" fill="var(--surface)" stroke="var(--accent)" strokeWidth="4"><title>{point.entry.storeName}: {formatCurrency(point.entry.unitPrice)}</title></circle>)}
      </svg>
      <figcaption>Evolución basada únicamente en tus compras finalizadas.</figcaption>
    </figure>
  )
}
