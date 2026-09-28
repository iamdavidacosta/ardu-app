import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'

export function PageLoader({ label = 'Cargando tu mercado…' }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <AlertTriangle size={24} />
      <p>{message}</p>
      {onRetry && (
        <button className="text-button" type="button" onClick={onRetry}>
          <RefreshCw size={16} /> Reintentar
        </button>
      )}
    </div>
  )
}
