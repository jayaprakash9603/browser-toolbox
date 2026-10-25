import { useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ImageIcon, LoaderCircleIcon, PipetteIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { rgbToHsl } from '@/core/engines/color'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { SPRING } from './labels'
import { HARMONIES, extractPalette, harmonyAngles, hexToRgb, normalizeHex, type Harmony, type Swatch } from './paletteModel'
import { ChipGroup, HarmonyGlyph } from './parts'

type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> }

const eyeDropper = () => (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper

/** Values that can't grow into a different color, so they apply while typing. */
const isComplete = (value: string) => /^#?[\da-f]{6}$/i.test(value.trim()) || /^(rgb|hsl)a?\(.*\)$/i.test(value.trim())

interface HarmonyControlsProps {
  base: string
  harmony: Harmony
  swatches: Swatch[]
  onBaseChange: (hex: string) => void
  onHarmonyChange: (harmony: Harmony) => void
  onExtracted: (hexes: string[]) => void
}

const SAMPLE_SIZE = 96

async function readImagePixels(file: File): Promise<Uint8ClampedArray> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, SAMPLE_SIZE / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('no-canvas')
    context.drawImage(image, 0, 0, width, height)
    return context.getImageData(0, 0, width, height).data
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function HarmonyControls({ base, harmony, swatches, onBaseChange, onHarmonyChange, onExtracted }: HarmonyControlsProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const errorId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(base)
  const [synced, setSynced] = useState(base)
  const [extracting, setExtracting] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [eyedropper] = useState(() => typeof window !== 'undefined' && !!eyeDropper())
  const [touched, setTouched] = useState(false)

  if (base !== synced) {
    setSynced(base)
    setDraft(base)
    setTouched(false)
  }

  const invalid = touched && normalizeHex(draft) === null

  const commitDraft = (value: string) => {
    setDraft(value)
    const hex = normalizeHex(value)
    if (hex && hex !== base) {
      setSynced(hex)
      onBaseChange(hex)
    }
  }

  const pick = async () => {
    const EyeDropper = eyeDropper()
    if (!EyeDropper) return
    try {
      const result = await new EyeDropper().open()
      commitDraft(result.sRGBHex)
    } catch {
      // The user dismissed the picker.
    }
  }

  const extract = async (file: File | undefined) => {
    if (!file) return
    setExtracting(true)
    setImageError(false)
    try {
      const colors = extractPalette(await readImagePixels(file), swatches.length)
      if (colors.length === 0) setImageError(true)
      else onExtracted(colors)
    } catch {
      setImageError(true)
    } finally {
      setExtracting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section
      aria-label={t('pg.controls.label')}
      className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[520px]:flex-row @[520px]:items-center @[520px]:gap-4 @[520px]:p-4"
    >
      <HarmonyWheel swatches={swatches} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-[11px] font-medium text-muted-foreground">
            {t('pg.baseColor')}
          </label>
          <div className="flex items-center gap-1.5">
            <label
              className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border shadow-xs ring-offset-2 ring-offset-background transition-transform duration-150 focus-within:ring-2 focus-within:ring-ring hover:scale-105"
              style={{ backgroundColor: base }}
            >
              <span className="sr-only">{t('pg.pickBase')}</span>
              <input
                type="color"
                value={base}
                onChange={(event) => commitDraft(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <Input
              id={inputId}
              value={draft}
              onChange={(event) => {
                setTouched(false)
                if (isComplete(event.target.value)) commitDraft(event.target.value)
                else setDraft(event.target.value)
              }}
              onBlur={() => {
                setTouched(true)
                commitDraft(draft)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setTouched(true)
                  commitDraft(draft)
                }
              }}
              spellCheck={false}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              className="min-w-0 flex-1 font-mono uppercase"
            />
            {eyedropper && (
              <Button variant="outline" size="icon" onClick={() => void pick()} aria-label={t('pg.eyedropper')} title={t('pg.eyedropper')}>
                <PipetteIcon />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              aria-label={t('pg.fromImage')}
              title={t('pg.fromImage')}
            >
              {extracting ? <LoaderCircleIcon className="animate-spin" /> : <ImageIcon />}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => void extract(event.target.files?.[0])}
            />
          </div>
          {invalid && (
            <p id={errorId} className="text-[11px] text-destructive">
              {t('pg.invalidColor')}
            </p>
          )}
          {imageError && (
            <p role="alert" className="text-[11px] text-destructive">
              {t('pg.imageError')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">{t('pg.harmony')}</span>
          <ChipGroup
            label={t('pg.harmony')}
            layoutId="pg-harmony"
            value={harmony}
            onChange={onHarmonyChange}
            options={HARMONIES.map((value) => ({
              value,
              label: t(`pg.harmonies.${value}`),
              title: t(`pg.harmonies.${value}Hint`),
              icon: <HarmonyGlyph angles={harmonyAngles(value)} />,
            }))}
          />
          <p className="text-[11px] text-muted-foreground text-pretty">{t(`pg.harmonies.${harmony}Hint`)}</p>
        </div>
      </div>
    </section>
  )
}

const WHEEL = 120
const CENTER = WHEEL / 2
const RADIUS = 50

/** Hue ring with a marker per color: angle is hue, distance from center is saturation. */
function HarmonyWheel({ swatches }: { swatches: Swatch[] }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const points = swatches.map((swatch) => {
    const { h, s } = rgbToHsl(hexToRgb(swatch.hex))
    const rad = (h * Math.PI) / 180
    const distance = 10 + (RADIUS - 10) * (s / 100)
    return { id: swatch.id, hex: swatch.hex, x: CENTER + distance * Math.sin(rad), y: CENTER - distance * Math.cos(rad) }
  })

  return (
    <div className="relative mx-auto size-[120px] shrink-0" role="img" aria-label={t('pg.wheelLabel')}>
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, var(--card) 0%, color-mix(in srgb, var(--card) 70%, transparent) 30%, transparent 72%), conic-gradient(hsl(0 85% 58%), hsl(60 85% 55%), hsl(120 70% 48%), hsl(180 75% 48%), hsl(240 80% 62%), hsl(300 75% 58%), hsl(360 85% 58%))',
        }}
        animate={reduce ? undefined : { rotate: [0, 2, -2, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div aria-hidden className="absolute inset-[9px] rounded-full border border-white/40 dark:border-black/30" />
      <svg viewBox={`0 0 ${WHEEL} ${WHEEL}`} className="absolute inset-0 overflow-visible" aria-hidden>
        {points.map((point) => (
          <motion.line
            key={`line-${point.id}`}
            x1={CENTER}
            y1={CENTER}
            initial={false}
            animate={{ x2: point.x, y2: point.y }}
            transition={SPRING}
            stroke="var(--foreground)"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}
        <circle cx={CENTER} cy={CENTER} r={2.5} fill="var(--foreground)" fillOpacity={0.6} />
        {points.map((point, index) => (
          <g key={point.id}>
            {index === 0 && !reduce && (
              <motion.circle
                initial={false}
                animate={{ cx: point.x, cy: point.y, r: [7, 12, 7], opacity: [0.45, 0, 0.45] }}
                transition={{ cx: SPRING, cy: SPRING, r: { duration: 2.2, repeat: Infinity }, opacity: { duration: 2.2, repeat: Infinity } }}
                fill={point.hex}
              />
            )}
            <motion.circle
              initial={false}
              animate={{ cx: point.x, cy: point.y, fill: point.hex }}
              transition={{ ...SPRING, fill: { duration: 0.4 } }}
              r={index === 0 ? 7 : 5.5}
              stroke="white"
              strokeWidth={2}
              className="drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
