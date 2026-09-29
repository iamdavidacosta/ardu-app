import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarcodeScanner } from './BarcodeScanner'

const decodeFromImageUrl = vi.hoisted(() => vi.fn())
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatOneDReader: class {
    decodeFromImageUrl = decodeFromImageUrl
  },
}))

afterEach(() => { cleanup(); decodeFromImageUrl.mockReset() })

describe('BarcodeScanner manual fallback', () => {
  it('accepts a typed barcode when the camera is unavailable', () => {
    const onDetected = vi.fn()
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('O escribe el código'), { target: { value: '07702047038772' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(onDetected).toHaveBeenCalledWith('07702047038772')
  })

  it('rejects text that is not a barcode', () => {
    const onDetected = vi.fn()
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('O escribe el código'), { target: { value: '7702ABC' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(onDetected).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('código numérico')
  })

  it('reads a barcode from a selected photo without uploading it', async () => {
    const onDetected = vi.fn()
    const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:barcode-photo') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    decodeFromImageUrl.mockResolvedValue({ getText: () => '7702047038772' })

    try {
      const { container } = render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />)
      const galleryInput = container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1]
      fireEvent.change(galleryInput, { target: { files: [new File(['pixels'], 'barcode.png', { type: 'image/png' })] } })

      await waitFor(() => expect(onDetected).toHaveBeenCalledWith('7702047038772'))
      expect(decodeFromImageUrl).toHaveBeenCalledWith('blob:barcode-photo')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:barcode-photo')
    } finally {
      if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it('rejects a non-image file before decoding', () => {
    const onDetected = vi.fn()
    const { container } = render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />)
    const galleryInput = container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1]
    fireEvent.change(galleryInput, { target: { files: [new File(['text'], 'receipt.pdf', { type: 'application/pdf' })] } })

    expect(screen.getByRole('alert')).toHaveTextContent('foto JPG')
    expect(decodeFromImageUrl).not.toHaveBeenCalled()
    expect(onDetected).not.toHaveBeenCalled()
  })
})
