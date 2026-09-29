import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, ImagePlus, ScanLine, X } from 'lucide-react'
import type { IScannerControls } from '@zxing/browser'
import { isBarcode } from '../utils/barcode'

const maxPhotoBytes = 10 * 1024 * 1024
const acceptedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/heic', 'image/heif'])

export function BarcodeScanner({ onDetected, onClose }: {
  onDetected: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const controlsRef = useRef<IScannerControls | undefined>(undefined)
  const activeRef = useRef(true)
  const handledRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [manualError, setManualError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [readingPhoto, setReadingPhoto] = useState(false)
  useEffect(() => { onDetectedRef.current = onDetected }, [onDetected])

  const finishDetection = useCallback((code: string) => {
    if (!activeRef.current || handledRef.current || !isBarcode(code)) return false
    handledRef.current = true
    controlsRef.current?.stop()
    onDetectedRef.current(code)
    return true
  }, [])

  useEffect(() => {
    let active = true
    activeRef.current = true

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setCameraError('La cámara en vivo no está disponible. Puedes usar una foto o escribir el código.')
    } else {
      void import('@zxing/browser').then(async ({ BrowserMultiFormatOneDReader }) => {
        if (!active || !videoRef.current) return
        const reader = new BrowserMultiFormatOneDReader()
        const scannerControls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _error, callbackControls) => {
          if (!active || !result) return
          const code = result.getText().trim()
          if (finishDetection(code)) callbackControls.stop()
        })
        if (active && !handledRef.current) controlsRef.current = scannerControls
        else scannerControls.stop()
      }).catch(() => {
        if (active) setCameraError('No pudimos abrir la cámara. Revisa el permiso, usa una foto o escribe el código.')
      })
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      active = false
      activeRef.current = false
      controlsRef.current?.stop()
      controlsRef.current = undefined
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [finishDetection, onClose])

  async function readPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!acceptedPhotoTypes.has(file.type)) return setPhotoError('Selecciona una foto JPG, PNG, WebP, GIF, BMP o HEIC.')
    if (file.size > maxPhotoBytes) return setPhotoError('La foto debe pesar menos de 10 MB.')

    setReadingPhoto(true)
    setPhotoError('')
    let objectUrl: string | undefined
    try {
      objectUrl = URL.createObjectURL(file)
      const { BrowserMultiFormatOneDReader } = await import('@zxing/browser')
      const result = await new BrowserMultiFormatOneDReader().decodeFromImageUrl(objectUrl)
      const code = result.getText().trim()
      if (activeRef.current && !handledRef.current && !finishDetection(code)) {
        setPhotoError('La foto no contiene un código de barras numérico legible. Prueba con más luz y enfoca las barras.')
      }
    } catch {
      if (activeRef.current && !handledRef.current) setPhotoError('No pudimos leer el código en esa foto. Prueba otra o escríbelo abajo.')
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (activeRef.current) setReadingPhoto(false)
    }
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = manualCode.trim()
    if (!isBarcode(code)) return setManualError('Escribe un código numérico de 4 a 32 dígitos.')
    setManualError('')
    finishDetection(code)
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bottom-sheet scanner-sheet" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <header className="sheet-heading"><div><p className="eyebrow">Compra actual</p><h2 id="scanner-title">Escanear producto</h2></div><button autoFocus className="icon-button" type="button" onClick={onClose} aria-label="Cerrar lector"><X size={20} /></button></header>
        <div className="scanner-photo-actions">
          <button className="secondary-button" type="button" disabled={readingPhoto} onClick={() => cameraInputRef.current?.click()}><Camera size={18} /> Tomar foto</button>
          <button className="secondary-button" type="button" disabled={readingPhoto} onClick={() => galleryInputRef.current?.click()}><ImagePlus size={18} /> Subir foto</button>
          <input ref={cameraInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif" capture="environment" onChange={(event) => void readPhoto(event)} />
          <input ref={galleryInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif" onChange={(event) => void readPhoto(event)} />
        </div>
        {readingPhoto && <p className="scanner-help" role="status">Buscando el código en la foto…</p>}
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        <div className="scanner-preview"><video ref={videoRef} muted playsInline aria-label="Vista de la cámara para leer el código de barras" /><span className="scanner-reticle" aria-hidden="true"><ScanLine size={38} /></span></div>
        {cameraError ? <p className="form-error" role="status">{cameraError}</p> : <p className="scanner-help"><Camera size={16} /> Centra el código de barras dentro del recuadro.</p>}
        <form className="scanner-manual" onSubmit={submitCode}>
          <label htmlFor="manual-barcode">O escribe el código</label>
          <div><input id="manual-barcode" type="text" inputMode="numeric" autoComplete="off" value={manualCode} onChange={(event) => setManualCode(event.target.value)} maxLength={32} placeholder="Ej. 7702047038772" /><button className="secondary-button" type="submit">Buscar</button></div>
          {manualError && <p className="form-error" role="alert">{manualError}</p>}
        </form>
      </section>
    </div>
  )
}
