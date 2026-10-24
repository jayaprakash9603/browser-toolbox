import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EraserIcon, ImageUpIcon, PenLineIcon, TypeIcon, XIcon } from 'lucide-react'

import { FileDropZone } from '@/shared/components/files'
import { OptionSwitch } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { decodeImage, trimCanvas, typedSignatureCanvas } from './raster'
import type { SavedSignature } from './signatures'

type Method = 'draw' | 'type' | 'upload'

const INKS = ['#111827', '#1d4ed8', '#7c3aed', '#b91c1c'] as const

const SCRIPT_FONTS = [
  { id: 'script', family: "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive" },
  { id: 'elegant', family: "'Lucida Handwriting', 'Apple Chancery', 'URW Chancery L', cursive" },
  { id: 'marker', family: "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive" },
] as const

function toSignature(canvas: HTMLCanvasElement): SavedSignature {
  return { id: crypto.randomUUID(), dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

function DrawPad({ ink, onChange }: { ink: string; onChange: (canvas: HTMLCanvasElement | null) => void }) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number; mx: number; my: number } | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const ratio = window.devicePixelRatio || 1
    node.width = Math.round(node.clientWidth * ratio) || 600
    node.height = Math.round(node.clientHeight * ratio) || 200
  }, [])

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const node = event.currentTarget
    const rect = node.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * node.width, y: ((event.clientY - rect.top) / rect.height) * node.height }
  }

  const stroke = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext('2d')
    const previous = last.current
    if (!context || !previous) return
    const { x, y } = point(event)
    const mx = (previous.x + x) / 2
    const my = (previous.y + y) / 2
    const ratio = window.devicePixelRatio || 1
    const pressure = event.pressure > 0 && event.pointerType === 'pen' ? event.pressure : 0.5
    context.strokeStyle = ink
    context.lineWidth = (1.6 + pressure * 2.4) * ratio
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(previous.mx, previous.my)
    context.quadraticCurveTo(previous.x, previous.y, mx, my)
    context.stroke()
    last.current = { x, y, mx, my }
  }

  const clear = () => {
    const node = canvas.current
    node?.getContext('2d')?.clearRect(0, 0, node.width, node.height)
    setEmpty(true)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border bg-white">
        <canvas
          ref={canvas}
          aria-label={t('pdf.sign.drawArea')}
          role="img"
          className="block h-44 w-full cursor-crosshair touch-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            const { x, y } = point(event)
            last.current = { x, y, mx: x, my: y }
            setEmpty(false)
          }}
          onPointerMove={(event) => {
            if (last.current) stroke(event)
          }}
          onPointerUp={(event) => {
            if (!last.current) return
            stroke(event)
            last.current = null
            onChange(trimCanvas(event.currentTarget))
          }}
          onPointerCancel={() => {
            last.current = null
          }}
        />
        <span className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-slate-300" aria-hidden />
        <AnimatePresence>
          {empty && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400"
            >
              {t('pdf.sign.drawHere')}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <Button variant="ghost" size="xs" onClick={clear} disabled={empty} className="self-end">
        <EraserIcon aria-hidden />
        {t('pdf.sign.clear')}
      </Button>
    </div>
  )
}

function removeWhite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let index = 0; index < data.length; index += 4) {
    const light = Math.min(data[index], data[index + 1], data[index + 2])
    if (light > 235) data[index + 3] = 0
    else if (light > 200) data[index + 3] = Math.round(data[index + 3] * ((235 - light) / 35))
  }
  context.putImageData(image, 0, 0)
  return canvas
}

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (signature: SavedSignature, remember: boolean) => void
}

export function SignatureDialog({ open, onOpenChange, onCreate }: SignatureDialogProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [method, setMethod] = useState<Method>('draw')
  const [ink, setInk] = useState<string>(INKS[0])
  const [drawn, setDrawn] = useState<HTMLCanvasElement | null>(null)
  const [typed, setTyped] = useState('')
  const [font, setFont] = useState<(typeof SCRIPT_FONTS)[number]['id']>('script')
  const [upload, setUpload] = useState<HTMLCanvasElement | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [cleanBackground, setCleanBackground] = useState(true)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    if (uploadUrl) URL.revokeObjectURL(uploadUrl)
  }, [uploadUrl])

  const family = SCRIPT_FONTS.find((entry) => entry.id === font)?.family ?? SCRIPT_FONTS[0].family

  const loadUpload = async (file: File) => {
    setError(null)
    try {
      const image = await decodeImage(file)
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      setUpload(canvas)
      setUploadUrl(URL.createObjectURL(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const create = () => {
    let canvas: HTMLCanvasElement | null = null
    if (method === 'draw') canvas = drawn
    else if (method === 'type') canvas = typedSignatureCanvas(typed, family, ink)
    else if (upload) {
      const copy = document.createElement('canvas')
      copy.width = upload.width
      copy.height = upload.height
      copy.getContext('2d')?.drawImage(upload, 0, 0)
      canvas = trimCanvas(cleanBackground ? removeWhite(copy) : copy) ?? copy
    }
    if (!canvas) return
    onCreate(toSignature(canvas), remember)
    setDrawn(null)
    setTyped('')
    setUpload(null)
    setUploadUrl(null)
  }

  const ready = method === 'draw' ? drawn !== null : method === 'type' ? typed.trim().length > 0 : upload !== null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1rem)] w-[min(34rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-2xl border bg-background p-4 shadow-2xl outline-none"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <div className="flex items-center gap-2">
                  <DialogPrimitive.Title className="flex-1 text-sm font-semibold">{t('pdf.sign.createTitle')}</DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t('dialogs.close')}>
                      <XIcon />
                    </Button>
                  </DialogPrimitive.Close>
                </div>
                <Segmented
                  ariaLabel={t('pdf.sign.method')}
                  value={method}
                  onValueChange={setMethod}
                  options={[
                    { value: 'draw', label: <><PenLineIcon aria-hidden />{t('pdf.sign.draw')}</> },
                    { value: 'type', label: <><TypeIcon aria-hidden />{t('pdf.sign.type')}</> },
                    { value: 'upload', label: <><ImageUpIcon aria-hidden />{t('pdf.sign.upload')}</> },
                  ]}
                  className="w-full [&>button]:flex-1"
                />

                {method !== 'upload' && (
                  <div className="flex items-center gap-2" role="radiogroup" aria-label={t('pdf.sign.ink')}>
                    <span className="text-[11px] font-medium text-muted-foreground">{t('pdf.sign.ink')}</span>
                    {INKS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={ink === color}
                        aria-label={color}
                        onClick={() => setInk(color)}
                        className={cn(
                          'size-6 cursor-pointer rounded-full border-2 border-background outline-none ring-offset-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                          ink === color && 'ring-2 ring-primary',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}

                {method === 'draw' && <DrawPad ink={ink} onChange={setDrawn} />}
                {method === 'type' && (
                  <div className="flex flex-col gap-2">
                    <Input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={t('pdf.sign.typePlaceholder')} aria-label={t('pdf.sign.typeLabel')} className="h-9" />
                    <div className="grid gap-2" role="radiogroup" aria-label={t('pdf.sign.style')}>
                      {SCRIPT_FONTS.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          role="radio"
                          aria-checked={font === entry.id}
                          onClick={() => setFont(entry.id)}
                          className={cn(
                            'flex h-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-white px-4 text-3xl text-ellipsis whitespace-nowrap outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring',
                            font === entry.id ? 'border-primary ring-2 ring-primary/25' : 'hover:border-foreground/20',
                          )}
                          style={{ fontFamily: entry.family, color: ink }}
                        >
                          {typed.trim() || t('pdf.sign.typeSample')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {method === 'upload' && (
                  <div className="flex flex-col gap-2">
                    {uploadUrl ? (
                      <div className="flex items-center justify-center rounded-xl border bg-white p-3">
                        <img src={uploadUrl} alt="" className="max-h-36 object-contain" />
                      </div>
                    ) : (
                      <FileDropZone compact accept="image/*" title={t('pdf.sign.uploadTitle')} hint={t('pdf.sign.uploadHint')} onFiles={([file]) => file && void loadUpload(file)} />
                    )}
                    {uploadUrl && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="self-end"
                        onClick={() => {
                          setUpload(null)
                          setUploadUrl(null)
                        }}
                      >
                        {t('pdf.sign.chooseOther')}
                      </Button>
                    )}
                    <OptionSwitch label={t('pdf.sign.removeWhite')} hint={t('pdf.sign.removeWhiteHint')} checked={cleanBackground} onChange={setCleanBackground} />
                    {error && <p className="text-[11px] text-destructive">{error}</p>}
                  </div>
                )}

                <OptionSwitch label={t('pdf.sign.remember')} hint={t('pdf.sign.rememberHint')} checked={remember} onChange={setRemember} />
                <div className="flex justify-end gap-2">
                  <DialogPrimitive.Close asChild>
                    <Button variant="ghost" size="sm">
                      {t('pdf.cancel')}
                    </Button>
                  </DialogPrimitive.Close>
                  <Button size="sm" onClick={create} disabled={!ready}>
                    {t('pdf.sign.useSignature')}
                  </Button>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
