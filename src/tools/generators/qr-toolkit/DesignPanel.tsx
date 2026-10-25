import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ImagePlusIcon, PaletteIcon, RotateCcwIcon, ShapesIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import type { QrErrorCorrection } from '@/core/engines/qrcode'
import { fileToDataUrl } from '@/core/engines/image'
import { SectionCard } from '@/shared/components/ValueCard'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Segmented } from '@/shared/components/ui/segmented'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import {
  COLOR_THEMES,
  DEFAULT_STYLE,
  themeMatches,
  type EyeShape,
  type GradientKind,
  type ModuleShape,
  type QrStyle,
} from './qrModel'

type Section = 'shape' | 'color' | 'extras'

const MODULE_SHAPES: ModuleShape[] = ['square', 'rounded', 'fluid', 'dots']
const EYE_SHAPES: EyeShape[] = ['square', 'rounded', 'circle', 'leaf']
const ECLS: QrErrorCorrection[] = ['L', 'M', 'Q', 'H']

interface DesignPanelProps {
  style: QrStyle
  onChange: (patch: Partial<QrStyle>) => void
  logo: string | null
  onLogo: (logo: string | null) => void
}

export function DesignPanel({ style, onChange, logo, onLogo }: DesignPanelProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [section, setSection] = useState<Section>('shape')

  return (
    <SectionCard
      icon={SparklesIcon}
      title={t('qrk.designTitle')}
      description={t('qrk.designHint')}
      actions={
        <Button variant="ghost" size="xs" onClick={() => onChange(DEFAULT_STYLE)}>
          <RotateCcwIcon aria-hidden />
          {t('qrk.reset')}
        </Button>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <ThemeSwatches style={style} onChange={onChange} />

      <Segmented
        ariaLabel={t('qrk.designTitle')}
        value={section}
        onValueChange={setSection}
        className="w-full [&>button]:flex-1"
        options={[
          { value: 'shape', label: <><ShapesIcon aria-hidden />{t('qrk.sectionShape')}</> },
          { value: 'color', label: <><PaletteIcon aria-hidden />{t('qrk.sectionColor')}</> },
          { value: 'extras', label: <><ImagePlusIcon aria-hidden />{t('qrk.sectionExtras')}</> },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={section}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {section === 'shape' && (
            <>
              <Row label={t('qrk.moduleShape')}>
                <ShapeChoices
                  ariaLabel={t('qrk.moduleShape')}
                  value={style.moduleShape}
                  options={MODULE_SHAPES}
                  onChange={(moduleShape) => onChange({ moduleShape })}
                  render={(shape) => <ModuleGlyph shape={shape} />}
                  label={(shape) => t(`qrk.module.${shape}`)}
                />
              </Row>
              <Row label={t('qrk.eyeShape')}>
                <ShapeChoices
                  ariaLabel={t('qrk.eyeShape')}
                  value={style.eyeShape}
                  options={EYE_SHAPES}
                  onChange={(eyeShape) => onChange({ eyeShape })}
                  render={(shape) => <EyeGlyph shape={shape} />}
                  label={(shape) => t(`qrk.eye.${shape}`)}
                />
              </Row>
              <Row label={t('qrk.correction')} hint={t(`qrk.eclHint.${style.ecl}`)}>
                <Segmented
                  ariaLabel={t('qrk.correction')}
                  value={style.ecl}
                  onValueChange={(ecl) => onChange({ ecl })}
                  className="w-full [&>button]:flex-1"
                  options={ECLS.map((ecl) => ({ value: ecl, label: t(`qrk.ecl.${ecl}`) }))}
                />
              </Row>
              <Row label={t('qrk.margin')} hint={t('qrk.marginValue', { count: style.margin })}>
                <Slider
                  min={0}
                  max={6}
                  step={1}
                  value={[style.margin]}
                  onValueChange={([margin]) => onChange({ margin })}
                  thumbLabel={t('qrk.margin')}
                />
              </Row>
            </>
          )}

          {section === 'color' && (
            <>
              <Row label={t('qrk.gradient')}>
                <Segmented
                  ariaLabel={t('qrk.gradient')}
                  value={style.gradient}
                  onValueChange={(gradient: GradientKind) => onChange({ gradient })}
                  className="w-full [&>button]:flex-1"
                  options={(['none', 'linear', 'radial'] as const).map((g) => ({ value: g, label: t(`qrk.gradientKind.${g}`) }))}
                />
              </Row>
              <div className="@container">
              <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
                <ColorField label={style.gradient === 'none' ? t('qrk.ink') : t('qrk.inkFrom')} value={style.fg} onChange={(fg) => onChange({ fg })} />
                {style.gradient !== 'none' && (
                  <ColorField label={t('qrk.inkTo')} value={style.fg2} onChange={(fg2) => onChange({ fg2 })} />
                )}
                <ColorField
                  label={t('qrk.eyes')}
                  value={style.eyeColor ?? style.fg}
                  onChange={(eyeColor) => onChange({ eyeColor })}
                  disabled={style.eyeColor === null}
                  toggle={{
                    label: t('qrk.eyesCustom'),
                    checked: style.eyeColor !== null,
                    onChange: (on) => onChange({ eyeColor: on ? style.fg : null }),
                  }}
                />
                <ColorField
                  label={t('qrk.background')}
                  value={style.bg}
                  onChange={(bg) => onChange({ bg })}
                  disabled={style.transparent}
                  toggle={{
                    label: t('qrk.transparent'),
                    checked: style.transparent,
                    onChange: (transparent) => onChange({ transparent }),
                  }}
                />
              </div>
              </div>
            </>
          )}

          {section === 'extras' && (
            <>
              <Row label={t('qrk.logo')} hint={logo ? undefined : t('qrk.logoHint')}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/50',
                      !logo && 'border-dashed',
                    )}
                  >
                    {logo ? (
                      <img src={logo} alt="" className="size-full object-contain p-1" />
                    ) : (
                      <ImagePlusIcon className="size-4 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <label className="cursor-pointer">
                      {logo ? t('qrk.replaceLogo') : t('qrk.addLogo')}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (file) void fileToDataUrl(file).then(onLogo)
                        }}
                      />
                    </label>
                  </Button>
                  {logo && (
                    <Button variant="ghost" size="icon-sm" aria-label={t('qrk.removeLogo')} onClick={() => onLogo(null)}>
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </Row>
              {logo && (
                <Row label={t('qrk.logoSize')} hint={`${Math.round(style.logoScale * 100)}%`}>
                  <Slider
                    min={0.14}
                    max={0.3}
                    step={0.01}
                    value={[style.logoScale]}
                    onValueChange={([logoScale]) => onChange({ logoScale })}
                    thumbLabel={t('qrk.logoSize')}
                  />
                </Row>
              )}
              <Row label={t('qrk.caption')}>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={style.showLabel}
                    onCheckedChange={(showLabel) => onChange({ showLabel })}
                    aria-label={t('qrk.showCaption')}
                  />
                  <Input
                    value={style.label}
                    maxLength={28}
                    disabled={!style.showLabel}
                    onChange={(e) => onChange({ label: e.target.value })}
                    aria-label={t('qrk.caption')}
                  />
                </div>
              </Row>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </SectionCard>
  )
}

function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hint && <span className="truncate text-xs text-muted-foreground/80">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ThemeSwatches({ style, onChange }: { style: QrStyle; onChange: (patch: Partial<QrStyle>) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <div role="radiogroup" aria-label={t('qrk.themes')} className="flex flex-wrap gap-2">
      {COLOR_THEMES.map((theme) => {
        const active = themeMatches(style, theme)
        const ink =
          theme.gradient === 'none' ? theme.fg : `linear-gradient(135deg, ${theme.fg}, ${theme.fg2})`
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(`qrk.theme.${theme.id}`)}
            aria-label={t(`qrk.theme.${theme.id}`)}
            onClick={() =>
              onChange({ fg: theme.fg, fg2: theme.fg2, gradient: theme.gradient, bg: theme.bg, eyeColor: theme.eyeColor, transparent: false })
            }
            className="relative flex size-10 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {active && (
              <motion.span
                layoutId="qr-theme-ring"
                aria-hidden
                className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-card"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <motion.span
              aria-hidden
              whileHover={reduce ? undefined : { scale: 1.08, rotate: 8 }}
              whileTap={{ scale: 0.92 }}
              className="relative grid size-8 grid-cols-2 gap-[2px] overflow-hidden rounded-full border p-[5px] shadow-xs"
              style={{ background: theme.bg }}
            >
              {[0, 1, 2, 3].map((cell) => (
                <span
                  key={cell}
                  className={cn('rounded-[2px]', cell === 1 && 'opacity-0')}
                  style={{ background: ink, backgroundSize: '200% 200%', backgroundPosition: cell % 2 ? '100% 0' : '0 100%' }}
                />
              ))}
            </motion.span>
          </button>
        )
      })}
    </div>
  )
}

function ShapeChoices<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  render,
  label,
}: {
  ariaLabel: string
  value: T
  options: T[]
  onChange: (value: T) => void
  render: (value: T) => ReactNode
  label: (value: T) => string
}) {
  const reduce = useReducedMotion()
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-4 gap-1.5">
      {options.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              'relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:border-primary/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'border-primary/40 text-primary hover:text-primary',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`qr-shape-${ariaLabel}`}
                aria-hidden
                className="absolute inset-0 rounded-[7px] bg-primary/10"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative">{render(option)}</span>
            <span className="relative truncate">{label(option)}</span>
          </button>
        )
      })}
    </div>
  )
}

function ModuleGlyph({ shape }: { shape: ModuleShape }) {
  const cells: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ]
  return (
    <svg viewBox="0 0 3 3" className="size-5" fill="currentColor" aria-hidden>
      {shape === 'fluid' ? (
        <path d="M0.5 0H2V1.5A0.5 0.5 0 0 1 1.5 2A0.5 0.5 0 0 1 1 1.5V1H0.5A0.5 0.5 0 0 1 0 0.5A0.5 0.5 0 0 1 0.5 0ZM0.5 2A0.5 0.5 0 1 1 0.5 3A0.5 0.5 0 1 1 0.5 2ZM2.5 2A0.5 0.5 0 1 1 2.5 3A0.5 0.5 0 1 1 2.5 2Z" />
      ) : (
        cells.map(([x, y]) =>
          shape === 'dots' ? (
            <circle key={`${x}${y}`} cx={x + 0.5} cy={y + 0.5} r={0.42} />
          ) : (
            <rect
              key={`${x}${y}`}
              x={shape === 'rounded' ? x + 0.08 : x}
              y={shape === 'rounded' ? y + 0.08 : y}
              width={shape === 'rounded' ? 0.84 : 1}
              height={shape === 'rounded' ? 0.84 : 1}
              rx={shape === 'rounded' ? 0.3 : 0}
            />
          ),
        )
      )}
    </svg>
  )
}

function EyeGlyph({ shape }: { shape: EyeShape }) {
  const outer = { square: 0, rounded: 2, circle: 3.5, leaf: 0 }[shape]
  const inner = { square: 0, rounded: 0.9, circle: 1.5, leaf: 0 }[shape]
  return (
    <svg viewBox="0 0 7 7" className="size-5" aria-hidden>
      {shape === 'leaf' ? (
        <>
          <path d="M3 0.5H6.5V4A2.5 2.5 0 0 1 4 6.5H0.5V3A2.5 2.5 0 0 1 3 0.5Z" fill="none" stroke="currentColor" />
          <path d="M3.5 2H5V3.5A1.5 1.5 0 0 1 3.5 5H2V3.5A1.5 1.5 0 0 1 3.5 2Z" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x={0.5} y={0.5} width={6} height={6} rx={Math.max(0, outer - 0.5)} fill="none" stroke="currentColor" />
          <rect x={2} y={2} width={3} height={3} rx={inner} fill="currentColor" />
        </>
      )}
    </svg>
  )
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
  toggle,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  toggle?: { label: string; checked: boolean; onChange: (checked: boolean) => void }
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const id = useId()
  const locked = Boolean(disabled)
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${id}-hex`} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {toggle && (
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`${id}-toggle`} className="cursor-pointer text-[11px] font-normal text-muted-foreground">
              {toggle.label}
            </Label>
            <Switch id={`${id}-toggle`} checked={toggle.checked} onCheckedChange={toggle.onChange} />
          </div>
        )}
      </div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md border border-input bg-background p-1 shadow-xs transition-[opacity,border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
          locked && 'opacity-50',
        )}
      >
        <span className="relative size-7 shrink-0 overflow-hidden rounded-[5px] border shadow-inner" style={{ background: value }}>
          <input
            type="color"
            value={value}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </span>
        <Input
          id={`${id}-hex`}
          value={draft ?? value}
          disabled={locked}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            const next = e.target.value
            setDraft(next)
            if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase())
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={draft !== null && !/^#[0-9a-f]{6}$/i.test(draft)}
          className="h-7 flex-1 border-0 bg-transparent px-1.5 font-mono uppercase shadow-none hover:border-0 focus-visible:ring-0 disabled:opacity-100"
        />
      </div>
    </div>
  )
}