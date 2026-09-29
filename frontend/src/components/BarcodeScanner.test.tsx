import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarcodeScanner } from './BarcodeScanner'

const decodeFromImageUrl = vi.hoisted(() => vi.fn())
const decodeFromConstraints = vi.hoisted(() => vi.fn())
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatOneDReader: class {
    decodeFromImageUrl = decodeFromImageUrl
    decodeFromConstraints = decodeFromConstraints
  },
}))

afterEach(() => { cleanup(); decodeFromImageUrl.mockReset(); decodeFromConstraints.mockReset() })

describe('BarcodeScanner manual fallback', () => {
  it('requests a high-resolution rear camera and offers hardware zoom when supported', async () => {
    const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = {
      getCapabilities: () => ({ zoom: { min: 1, max: 3, step: 0.5 }, focusMode: ['continuous'] }),
      getSettings: () => ({ zoom: 1 }),
      applyConstraints,
    }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } })
    decodeFromConstraints.mockImplementation(async (_constraints, video: HTMLVideoElement) => {
      Object.defineProperty(video, 'srcObject', { configurable: true, value: { getVideoTracks: () => [track] } })
      return { stop: vi.fn() }
    })

    try {
      render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />)
      await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled())
      expect(decodeFromConstraints.mock.calls[0][0]).toEqual({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      const slider = await screen.findByRole('slider', { name: 'Acercar imagen' })
      fireEvent.change(slider, { target: { value: '2' } })
      await waitFor(() => expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 2 }] }))
    } finally {
      if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices)
      else Reflect.deleteProperty(navigator, 'mediaDevices')
    }
  })

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
