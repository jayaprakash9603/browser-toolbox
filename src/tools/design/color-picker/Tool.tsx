import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckIcon, CopyIcon, MousePointerClickIcon, PipetteIcon, StarIcon, Trash2Icon, XIcon } from 'lucide-react'

import {
  COLOR_FORMATS,
  SHADE_LIGHTNESS,
  formatColor,
  type ColorFormat,
  type PickedColor,
} from '@/core/color-picker/model'
import {
  checkContrast,
  oklchToRgb,
  parseColor,
  relativeLuminance,
  rgbToHex,
  rgbToOklch,
  type Rgb,
} from '@/core/engines/color'
import { sendMessage } from '@/core/messaging'
import { useShortcutDisplay } from '@/features/shortcuts/useShortcutDisplay'
import { ToolPage } from '@/shared/components/ToolPage'
import { cn } from '@/shared/utils/cn'
import { useDesignTool } from '../_shared'
import { useColorPickerStore } from './hooks'
import './i18n'

interface EyeDropperResult {
  sRGBHex: string
}
declare global {
  interface Window {
    EyeDropper?: new () => { open(): Promise<EyeDropperResult> }
  }
}

const SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 } as const

function toRgb(hex: string | null): Rgb | null {
  if (!hex) return null
  const parsed = parseColor(hex)
  return parsed.ok ? parsed.value : null
}

function hostOf(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Copies text and reports success for ~1.2s so the row can show a confirmation. */
function useCopied() {
  const [key, setKey] = useState<string | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setKey(id)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setKey(null), 1200)
  }, [])
  return { copiedKey: key, copy }
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

export default function ColorPickerTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.color-picker')
  const reduce = useReducedMotion()
  const shortcut = useShortcutDisplay('pick-color')
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const supported = typeof window !== 'undefined' && 'EyeDropper' in window
  const { copiedKey, copy } = useCopied()

  const { state, setFormat, remember, removeColor, clearHistory } = useColorPickerStore(setPicked)

  const value = useMemo(() => toRgb(picked), [picked])
  const hex = value ? rgbToHex(value) : null

  const select = useCallback(
    (next: string) => {
      setPicked(next)
      remember(next)
    },
    [remember],
  )

  const pickFromPage = async () => {
    setBusy(true)
    try {
      await sendMessage({ type: 'COLOR_PICK_START' })
    } finally {
      window.setTimeout(() => setBusy(false), 350)
    }
  }

  const pickFromScreen = async () => {
    if (!window.EyeDropper) return
    try {
      const result = await new window.EyeDropper().open()
      select(result.sRGBHex)
    } catch {
      /* user cancelled */
    }
  }

  const shades = useMemo(() => {
    if (!value) return []
    const base = rgbToOklch(value)
    const seen = new Set<string>()
    return SHADE_LIGHTNESS.map((l) => rgbToHex(oklchToRgb({ l, c: base.c, h: base.h }))).filter((shade) => {
      if (seen.has(shade)) return false
      seen.add(shade)
      return true
    })
  }, [value])

  const contrast = useMemo(
    () =>
      value
        ? {
            white: checkContrast(value, { r: 255, g: 255, b: 255 }),
            black: checkContrast(value, { r: 0, g: 0, b: 0 }),
          }
        : null,
    [value],
  )

  const onDark = value ? relativeLuminance(value) < 0.4 : true

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2" aria-label={t('colorPicker.pickPage')}>
          <motion.button
            type="button"
            onClick={() => void pickFromPage()}
            disabled={busy}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className="group flex items-center gap-3 rounded-xl bg-primary px-3.5 py-3 text-left text-primary-foreground shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-foreground/15">
              <PipetteIcon className="size-4.5 transition-transform duration-200 group-hover:-rotate-12" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t('colorPicker.pickPage')}</span>
              <span className="block text-xs opacity-80">{t('colorPicker.pickPageHint')}</span>
            </span>
            <kbd className="shrink-0 rounded-md bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[10px]">
              {shortcut}
            </kbd>
          </motion.button>

          <div className="grid grid-cols-2 gap-2">
            {supported && (
              <button
                type="button"
                onClick={() => void pickFromScreen()}
                title={t('colorPicker.pickScreenHint')}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background text-[13px] font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <MousePointerClickIcon className="size-4" /> {t('colorPicker.pickScreen')}
              </button>
            )}
            <label
              className={cn(
                'relative flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-background text-[13px] font-medium transition-colors focus-within:outline-2 focus-within:outline-ring hover:bg-accent',
                !supported && 'col-span-2',
              )}
            >
              <span
                className="size-4 rounded-full border border-black/10 dark:border-white/15"
                style={{ background: hex ?? 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              />
              {t('colorPicker.chooseCustom')}
              <input
                type="color"
                value={hex ?? '#3b82f6'}
                onChange={(event) => setPicked(event.target.value)}
                onBlur={(event) => select(event.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                aria-label={t('colorPicker.chooseCustom')}
              />
            </label>
          </div>
        </section>

        <AnimatePresence mode="popLayout" initial={false}>
          {value && hex ? (
            <motion.div
              key="details"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="flex flex-col gap-4"
            >
              <motion.button
                type="button"
                aria-label={t('colorPicker.copyAs', { format: 'HEX' })}
                onClick={() => void copy('hero', hex)}
                animate={{ backgroundColor: hex }}
                transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }}
                whileTap={reduce ? undefined : { scale: 0.99 }}
                className={cn(
                  'relative flex h-28 items-end justify-between overflow-hidden rounded-2xl border border-black/10 p-3 text-left shadow-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10',
                  onDark ? 'text-white' : 'text-black',
                )}
              >
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {t('colorPicker.current')}
                  </span>
                  <span className="font-mono text-2xl font-semibold tracking-tight">{hex.toUpperCase()}</span>
                </span>
                <span className="grid size-8 place-items-center rounded-full bg-current/15 backdrop-blur-sm">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copiedKey === 'hero' ? 'ok' : 'copy'}
                      initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                    >
                      {copiedKey === 'hero' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.button>

              <section className="flex flex-col gap-1.5" aria-label={t('colorPicker.formats')}>
                <div className="flex items-baseline justify-between">
                  <h3 className={sectionTitle}>{t('colorPicker.formats')}</h3>
                  <span className="text-[10px] text-muted-foreground">{t('colorPicker.defaultNote')}</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {COLOR_FORMATS.map((format) => (
                    <FormatRow
                      key={format}
                      format={format}
                      text={formatColor(value, format)}
                      isDefault={state.format === format}
                      copied={copiedKey === format}
                      onCopy={() => void copy(format, formatColor(value, format))}
                      onDefault={() => setFormat(format)}
                    />
                  ))}
                </ul>
              </section>

              {contrast && (
                <section className="flex flex-col gap-1.5" aria-label={t('colorPicker.contrast')}>
                  <h3 className={sectionTitle}>{t('colorPicker.contrast')}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ContrastCard label={t('colorPicker.onWhite')} bg="#ffffff" fg={hex} result={contrast.white} />
                    <ContrastCard label={t('colorPicker.onBlack')} bg="#000000" fg={hex} result={contrast.black} />
                  </div>
                </section>
              )}

              <section className="flex flex-col gap-1.5" aria-label={t('colorPicker.shades')}>
                <div className="flex items-baseline justify-between">
                  <h3 className={sectionTitle}>{t('colorPicker.shades')}</h3>
                  <span className="text-[10px] text-muted-foreground">{t('colorPicker.shadesHint')}</span>
                </div>
                <div className="scrollbar-styled flex snap-x gap-1 overflow-x-auto overscroll-x-contain pb-1">
                  {shades.map((shade) => (
                    <motion.button
                      key={shade}
                      type="button"
                      title={shade}
                      aria-label={t('colorPicker.selectColor', { color: shade })}
                      onClick={() => setPicked(shade)}
                      whileHover={reduce ? undefined : { y: -2 }}
                      whileTap={reduce ? undefined : { scale: 0.94 }}
                      className={cn(
                        'h-10 min-w-9 flex-1 snap-start rounded-md border border-black/10 focus-visible:outline-2 focus-visible:outline-ring dark:border-white/10',
                        shade === hex && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                      )}
                      style={{ backgroundColor: shade }}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground"
            >
              {t('colorPicker.empty')}
            </motion.p>
          )}
        </AnimatePresence>

        <section className="flex flex-col gap-1.5" aria-label={t('colorPicker.history')}>
          <div className="flex items-center justify-between">
            <h3 className={sectionTitle}>{t('colorPicker.history')}</h3>
            {state.history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Trash2Icon className="size-3" /> {t('colorPicker.clearHistory')}
              </button>
            )}
          </div>
          {state.history.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('colorPicker.historyEmpty')}</p>
          ) : (
            <ul className="scrollbar-styled grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain p-0.5">
              <AnimatePresence initial={false} mode="popLayout">
                {state.history.map((item) => (
                  <HistoryChip
                    key={item.hex}
                    item={item}
                    active={item.hex === hex}
                    reduce={Boolean(reduce)}
                    onSelect={() => setPicked(item.hex)}
                    onRemove={() => removeColor(item.hex)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </div>
    </ToolPage>
  )
}

function FormatRow({
  format,
  text,
  isDefault,
  copied,
  onCopy,
  onDefault,
}: {
  format: ColorFormat
  text: string
  isDefault: boolean
  copied: boolean
  onCopy: () => void
  onDefault: () => void
}) {
  const { t } = useTranslation()
  const label = format.toUpperCase()
  return (
    <li className="group flex items-center gap-1 rounded-lg border bg-muted/30 transition-colors hover:bg-muted/60">
      <button
        type="button"
        onClick={onCopy}
        aria-label={t('colorPicker.copyAs', { format: label })}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="w-11 shrink-0 text-[11px] font-semibold text-muted-foreground">{label}</span>
        <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{text}</code>
        <span className="grid size-5 place-items-center">
          {copied ? (
            <CheckIcon className="size-3.5 text-green-600" />
          ) : (
            <CopyIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onDefault}
        aria-pressed={isDefault}
        aria-label={t('colorPicker.setDefault', { format: label })}
        title={t('colorPicker.setDefault', { format: label })}
        className={cn(
          'mr-1 grid size-7 place-items-center rounded-md transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
          isDefault ? 'text-amber-500' : 'text-muted-foreground/50',
        )}
      >
        <StarIcon className={cn('size-3.5', isDefault && 'fill-current')} />
      </button>
    </li>
  )
}

function ContrastCard({
  label,
  bg,
  fg,
  result,
}: {
  label: string
  bg: string
  fg: string
  result: ReturnType<typeof checkContrast>
}) {
  const { t } = useTranslation()
  const grade = result.aaaNormal ? 'AAA' : result.aaNormal ? 'AA' : result.aaLarge ? 'AA Large' : t('colorPicker.fail')
  const passes = result.aaLarge
  return (
    <div className="flex items-center gap-2.5 rounded-lg border p-2" style={{ backgroundColor: bg }}>
      <span className="text-xl font-bold leading-none" style={{ color: fg }}>
        {t('colorPicker.sample')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px]" style={{ color: bg === '#ffffff' ? '#52525b' : '#a1a1aa' }}>
          {label}
        </span>
        <span className="block font-mono text-xs font-semibold" style={{ color: bg === '#ffffff' ? '#18181b' : '#fafafa' }}>
          {result.ratio}:1
        </span>
      </span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          passes ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500',
        )}
      >
        {grade}
      </span>
    </div>
  )
}

function HistoryChip({
  item,
  active,
  reduce,
  onSelect,
  onRemove,
}: {
  item: PickedColor
  active: boolean
  reduce: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const host = hostOf(item.url)
  const title = host ? `${item.hex} · ${t('colorPicker.fromPage', { host })}` : item.hex
  return (
    <motion.li
      layout={reduce ? false : 'position'}
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      transition={SPRING}
      className="group relative"
    >
      <button
        type="button"
        onClick={onSelect}
        title={title}
        aria-label={t('colorPicker.selectColor', { color: item.hex })}
        aria-pressed={active}
        className={cn(
          'block aspect-square w-full rounded-lg border border-black/10 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring dark:border-white/10',
          active && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
        )}
        style={{ backgroundColor: item.hex }}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('colorPicker.removeColor', { color: item.hex })}
        className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        <XIcon className="size-2.5" />
      </button>
    </motion.li>
  )
}
