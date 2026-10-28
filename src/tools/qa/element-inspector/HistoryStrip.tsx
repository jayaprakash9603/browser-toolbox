import { ClockIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import type { HistoryItem } from './storage'

export function HistoryStrip({
  items,
  activeId,
  onRestore,
  onClear,
}: {
  items: HistoryItem[]
  activeId: string | null
  onRestore: (item: HistoryItem) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  return (
    <section className="flex min-w-0 flex-col gap-1.5" aria-label={t('inspectorEl.history')}>
      <div className="flex items-center gap-1.5">
        <ClockIcon className="size-3.5 text-muted-foreground" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
          {t('inspectorEl.history')}
        </h2>
        <Button variant="ghost" size="xs" onClick={onClear} aria-label={t('inspectorEl.historyClear')}>
          <Trash2Icon />
          {t('inspectorEl.historyClear')}
        </Button>
      </div>
      <ul className="flex gap-1 overflow-x-auto pb-0.5">
        {items.map((item) => {
          const selected = item.id === activeId
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onRestore(item)}
                aria-pressed={selected}
                className={cn(
                  'inline-flex h-8 max-w-[9.5rem] items-center rounded-full border px-2.5 font-mono text-[11px] outline-none transition-colors',
                  'hover:border-foreground/20 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'bg-card text-muted-foreground',
                )}
              >
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
