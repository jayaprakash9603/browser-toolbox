import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { BoxEdges, ElementInspect } from '@/core/engines/selector-studio'
import { cn } from '@/shared/utils/cn'

function formatPx(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function EdgeLabel({ value }: { value: number }) {
  return <span className="min-w-[1.25rem] text-center font-mono text-[10px] tabular-nums">{formatPx(value)}</span>
}

function Layer({
  label,
  edges,
  className,
  children,
}: {
  label: string
  edges: BoxEdges
  className: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-0.5 rounded-sm',
        className,
      )}
    >
      <span className="col-span-3 px-1 pt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span />
      <div className="flex justify-center">
        <EdgeLabel value={edges.top} />
      </div>
      <span />
      <div className="flex justify-end">
        <EdgeLabel value={edges.left} />
      </div>
      <div className="min-w-0">{children}</div>
      <div className="flex justify-start">
        <EdgeLabel value={edges.right} />
      </div>
      <span />
      <div className="flex justify-center pb-0.5">
        <EdgeLabel value={edges.bottom} />
      </div>
      <span />
    </div>
  )
}

export function BoxModel({ inspect }: { inspect: ElementInspect }) {
  const { t } = useTranslation()
  const { width, height } = inspect.box

  return (
    <div
      data-testid="studio-box-model"
      className="rounded-md border border-border/70 bg-muted/20 p-2"
      aria-label={t('studio.boxModel.label')}
    >
      <Layer label={t('studio.boxModel.margin')} edges={inspect.margin} className="bg-amber-500/15 p-1">
        <Layer label={t('studio.boxModel.padding')} edges={inspect.padding} className="bg-emerald-500/15 p-1">
          <p className="rounded-sm bg-background/80 px-2 py-1.5 text-center font-mono text-[11px] leading-4">
            {Math.round(width)} × {Math.round(height)}
          </p>
        </Layer>
      </Layer>
    </div>
  )
}
