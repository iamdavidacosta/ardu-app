import { useEffect, useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { productsService } from '../services/products.service'
import type { PresentationUnit, Product } from '../types/domain'

const units: PresentationUnit[] = ['g', 'kg', 'ml', 'L', 'unidades']

export function ProductForm({ initialName = '', initialBarcode, initialQuantity, initialUnit, onSaved, onCancel }: {
  initialName?: string
  initialBarcode?: string
  initialQuantity?: number
  initialUnit?: PresentationUnit
  onSaved: (product: Product) => void
  onCancel: () => void
}) {
  const { session } = useAuth()
  const [name, setName] = useState(initialName.slice(0, 120))
  const [quantity, setQuantity] = useState(initialQuantity?.toString() ?? (initialBarcode ? '' : '1'))
  const [unit, setUnit] = useState<PresentationUnit>(initialUnit ?? (initialBarcode ? 'unidades' : 'kg'))
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const presentationQuantity = Number(quantity)
    if (!name.trim()) return setError('Escribe el nombre del producto.')
    if (!Number.isFinite(presentationQuantity) || presentationQuantity <= 0) return setError('La presentación debe ser mayor que cero.')
    if (!session) return

    setSaving(true)
    setError('')
    try {
      const product = await productsService.create(session.user.id, {
        barcode: initialBarcode,
        name,
        presentationQuantity,
        presentationUnit: unit,
        category: category.trim() || null,
        active: true,
      })
      onSaved(product)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="sheet-heading"><div><p className="eyebrow">Catálogo reutilizable</p><h2>Nuevo producto</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Cerrar"><X size={20} /></button></div>
      {initialBarcode && <p className="barcode-hint">Código {initialBarcode}. Completa el nombre y la presentación para añadirlo a tu catálogo.</p>}
      <label>Nombre<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ej. Arroz Diana" required /></label>
      <div className="field-grid">
        <label>Presentación<input type="number" inputMode="decimal" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
        <label>Unidad<select value={unit} onChange={(event) => setUnit(event.target.value as PresentationUnit)}>{units.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
      <label>Categoría <span className="optional">opcional</span><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="Ej. Despensa" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={saving}><Check size={18} />{saving ? 'Guardando…' : 'Guardar producto'}</button>
    </form>
  )
}
