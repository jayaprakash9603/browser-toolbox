import { HighlighterIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SelectorCandidate } from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

export function HubSelectorLine({
  candidate,
  selected,
  onSelect,
  onHighlight,
}: {
  candidate: SelectorCandidate
  selected: boolean
  onSelect: () => void
  onHighlight: () => void
}) {
  const { t } = useTranslation()
  const tested = candidate.matchCount != null
  const unique = candidate.uniqueness === 'unique'

  return (
    <div
      className={cn(
        'group flex min-w-0 items-start gap-1 border-b border-border/60 py-1.5 pl-1 pr-0.5 last:border-b-0',
        selected && 'bg-primary/5',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <code className="block break-all font-mono text-[11px] leading-5 text-foreground">{candidate.expression}</code>
        {tested && (
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {unique
              ? t('studio.hub.uniqueCount', { count: candidate.matchCount })
              : t('studio.hub.matchCount', { count: candidate.matchCount })}
          </span>
        )}
      </button>
      <span className="flex shrink-0 items-center gap-0 opacity-100 @[420px]:opacity-90 group-hover:opacity-100 group-focus-within:opacity-100">
        <CopyButton text={candidate.expression} size="icon-xs" />
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('studio.highlightRow')}
          onClick={onHighlight}
        >
          <HighlighterIcon />
        </Button>
      </span>
    </div>
  )
}
