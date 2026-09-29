import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogEditor } from './CatalogEditor'

const update = vi.hoisted(() => vi.fn())
vi.mock('../services/catalog.service', () => ({ catalogService: { update } }))

afterEach(() => { cleanup(); update.mockReset() })

describe('CatalogEditor', () => {
  it('saves a shared correction without changing the barcode', async () => {
    const product = { code: '7622201735432', productName: 'Trident', quantity: '45,5 gramos' }
    const corrected = { ...product, productName: 'Trident Fresa' }
    update.mockResolvedValue(corrected)
    const onSaved = vi.fn()
    render(<CatalogEditor product={product} onSaved={onSaved} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Trident Fresa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith(product.code, 'Trident Fresa', product.quantity))
    expect(onSaved).toHaveBeenCalledWith(corrected)
  })
})
