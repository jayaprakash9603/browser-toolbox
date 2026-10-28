import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { CapturedElement } from '@/core/engines/selector'
import { boxModelOf, occupancyPct, type BoxSides } from '@/core/engines/selector/inspect'
import { cn } from '@/shared/utils/cn'

function sideLabel(sides: BoxSides): string {
  if (sides.top === sides.right && sides.right === sides.bottom && sides.bottom === sides.left) {
    return String(round(sides.top))
  }
  return `${round(sides.top)} ${round(sides.right)} ${round(sides.bottom)} ${round(sides.left)}`
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

export function BoxTab({ element }: { element: CapturedElement }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const box = boxModelOf(element)
  const occupancy = occupancyPct(element)
  const { width, height, x, y } = element.dimensions
  const viewport = element.viewport ?? { width: 1280, height: 720 }
  const aspect = height > 0 ? width / height : 0

  return (
    <div className="flex flex-col gap-3" data-search-id="section-box">
      <BoxModelViz
        margin={box.margin}
        border={box.border}
        padding={box.padding}
        content={`${Math.round(width)} × ${Math.round(height)}`}
        labels={{
          margin: t('inspectorEl.margin'),
          border: t('inspectorEl.border'),
          padding: t('inspectorEl.padding'),
          content: t('inspectorEl.content'),
        }}
      />

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border bg-card p-2.5 shadow-xs">
          <p className="text-[11px] text-muted-foreground">{t('inspectorEl.aspect')}</p>
          <p className="text-sm font-semibold tabular-nums">
            {aspect > 0 ? aspect.toFixed(2) : '—'}
            <span className="ml-1 text-[11px] font-medium text-muted-foreground">
              {Math.round(width)}×{Math.round(height)}
            </span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-2.5 shadow-xs">
          <p className="text-[11px] text-muted-foreground">{t('inspectorEl.occupancy')}</p>
          <p className="text-sm font-semibold tabular-nums">
            {occupancy == null ? '—' : `${occupancy.toFixed(1)}%`}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <motion.span
              className="block h-full rounded-full bg-violet-500"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${occupancy ?? 0}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-2.5 shadow-xs">
        <h3 className="mb-2 text-[11px] font-medium text-muted-foreground">
          {t('inspectorEl.positionMap')}
        </h3>
        <svg
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          className="h-24 w-full rounded-md border bg-muted/40"
          role="img"
          aria-label={`${t('inspectorEl.positionMap')}: ${Math.round(x)}, ${Math.round(y)}`}
        >
          <rect
            x={Math.max(0, x)}
            y={Math.max(0, y)}
            width={Math.max(1, width)}
            height={Math.max(1, height)}
            className="fill-violet-500/50 stroke-violet-600"
            strokeWidth={Math.max(1, viewport.width / 200)}
          />
        </svg>
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
          {Math.round(x)}, {Math.round(y)} · {element.computedStyles.position ?? 'static'} ·{' '}
          {element.computedStyles.display ?? 'block'}
        </p>
      </section>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        <Row label={t('inspectorEl.margin')} value={sideLabel(box.margin)} />
        <Row label={t('inspectorEl.border')} value={sideLabel(box.border)} />
        <Row label={t('inspectorEl.padding')} value={sideLabel(box.padding)} />
        <Row label="box-sizing" value={element.computedStyles['box-sizing'] ?? '—'} />
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2 border-b border-border/60 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate tabular-nums">{value}</dd>
    </div>
  )
}

function BoxModelViz({
  margin,
  border,
  padding,
  content,
  labels,
}: {
  margin: BoxSides
  border: BoxSides
  padding: BoxSides
  content: string
  labels: { margin: string; border: string; padding: string; content: string }
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card p-2 shadow-xs">
      <Layer
        className="bg-amber-500/15 text-amber-900 dark:text-amber-200"
        sides={margin}
        label={labels.margin}
      >
        <Layer
          className="bg-stone-500/20 text-stone-800 dark:text-stone-200"
          sides={border}
          label={labels.border}
        >
          <Layer
            className="bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
            sides={padding}
            label={labels.padding}
          >
            <div className="flex min-h-10 items-center justify-center rounded-sm bg-sky-500/20 px-2 py-1.5 text-center">
              <p className="text-[11px] font-semibold tabular-nums text-sky-950 dark:text-sky-100">
                {content}
                <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                  {labels.content}
                </span>
              </p>
            </div>
          </Layer>
        </Layer>
      </Layer>
    </div>
  )
}

function Layer({
  className,
  sides,
  label,
  children,
}: {
  className?: string
  sides: BoxSides
  label: string
  children: ReactNode
}) {
  return (
    <div className={cn('relative rounded-md', className)} style={{ padding: layerPad(sides) }}>
      <span className="absolute left-1 top-0.5 text-[9px] font-medium uppercase tracking-wide opacity-80">
        {label} {round(sides.top)}
      </span>
      {children}
    </div>
  )
}

function layerPad(sides: BoxSides): string {
  const top = Math.max(14, Math.min(28, 10 + sides.top))
  const right = Math.max(10, Math.min(24, 8 + sides.right))
  const bottom = Math.max(10, Math.min(24, 8 + sides.bottom))
  const left = Math.max(10, Math.min(24, 8 + sides.left))
  return `${top}px ${right}px ${bottom}px ${left}px`
}
