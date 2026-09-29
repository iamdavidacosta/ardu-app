import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import { catalogService } from '../services/catalog.service'
import type { CatalogProduct } from '../types/domain'

export function CatalogEditor({ product, onSaved, onClose }: {
  product: CatalogProduct
  onSaved: (product: CatalogProduct) => void
  onClose: () => void
}) {
  const [name, setName] = useState(product.productName ?? '')
  const [quantity, setQuantity] = useState(product.quantity ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)

  useEffect(() => {
    const previousFocus = returnFocus.current
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape); previousFocus?.focus() }
  }, [onClose])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      onSaved(await catalogService.update(product.code, name, quantity))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible corregir el producto.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="bottom-sheet product-form" role="dialog" aria-modal="true" aria-label={`Corregir ${product.code}`} onSubmit={(event) => void save(event)}>
      <div className="sheet-heading"><div><p className="eyebrow">Catálogo compartido</p><h2>Corregir producto</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
      <p className="barcode-hint">Código {product.code}. Esta corrección será visible para todos.</p>
      <label>Nombre<input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Presentación<input maxLength={120} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Ej. 45,5 gramos" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={saving}><Check size={18} />{saving ? 'Guardando…' : 'Guardar corrección'}</button>
    </form>
  </div>
}
