import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { SelectorCandidate } from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'

function FieldRow({
  label,
  candidate,
  selected,
  onSelect,
}: {
  label: string
  candidate: SelectorCandidate | null
  selected: boolean
  onSelect: () => void
}) {
  if (!candidate) return null

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="w-[3.25rem] shrink-0 pt-1.5 text-[10px] font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'min-w-0 flex-1 rounded border px-2 py-1 text-left font-mono text-[11px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected ? 'border-primary/50 bg-primary/5' : 'border-border/80 bg-background',
        )}
      >
        {candidate.expression}
      </button>
      <CopyButton text={candidate.expression} />
    </div>
  )
}

export function HubSelectorFields({
  model,
  variant = 'compact',
}: {
  model: SelectorStudioModel
  variant?: 'compact' | 'panel'
}) {
  const { t } = useTranslation()
  const { auto, css, xpath } = useMemo(() => {
    const list = model.candidates
    const cssPick = list.find((item) => item.kind === 'css') ?? null
    const xpathPick = list.find((item) => item.kind === 'xpath') ?? null
    return {
      auto: model.active,
      css: cssPick,
      xpath: xpathPick,
    }
  }, [model.active, model.candidates])

  if (!model.snapshot) return null

  return (
    <section
      className={cn(
        'mb-2 space-y-1.5 border-b border-border/60 pb-2',
        variant === 'panel' && 'rounded-md border border-border/70 bg-card/80 px-2 py-2',
      )}
      aria-label={t('studio.hub.selectorFields')}
    >
      <FieldRow
        label={t('studio.hub.auto')}
        candidate={auto}
        selected={Boolean(auto && model.active?.id === auto.id)}
        onSelect={() => auto && model.setActive(auto)}
      />
      <FieldRow
        label={t('studio.hub.cssLabel')}
        candidate={css}
        selected={Boolean(css && model.active?.id === css.id)}
        onSelect={() => css && model.setActive(css)}
      />
      <FieldRow
        label={t('studio.hub.xpathLabel')}
        candidate={xpath}
        selected={Boolean(xpath && model.active?.id === xpath.id)}
        onSelect={() => xpath && model.setActive(xpath)}
      />
    </section>
  )
}
