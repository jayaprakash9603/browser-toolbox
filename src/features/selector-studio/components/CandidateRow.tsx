import { HighlighterIcon, PlayIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { SelectorCandidate } from '@/core/engines/selector-studio'
import { statusLabel } from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

export function uniquenessVariant(uniqueness: SelectorCandidate['uniqueness']) {
  if (uniqueness === 'unique') return 'default' as const
  if (uniqueness === 'multiple') return 'secondary' as const
  if (uniqueness === 'none') return 'destructive' as const
  return 'outline' as const
}

export function CandidateBadges({ candidate }: { candidate: SelectorCandidate }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-1">
      {candidate.syntaxValid === false ? (
        <Badge variant="destructive">{t('studio.invalid')}</Badge>
      ) : candidate.syntaxValid ? (
        <Badge variant="secondary">{t('studio.valid')}</Badge>
      ) : null}
      {candidate.uniqueness === 'unique' ? (
        <Badge>{t('studio.unique')}</Badge>
      ) : candidate.uniqueness === 'multiple' ? (
        <Badge variant="secondary">{t('studio.notUnique')}</Badge>
      ) : candidate.uniqueness === 'none' ? (
        <Badge variant="destructive">{t('studio.zero')}</Badge>
      ) : null}
      {candidate.strategy === 'test-attribute' || candidate.strategy === 'id' ? (
        <Badge variant="outline">{t('studio.stable')}</Badge>
      ) : null}
    </div>
  )
}

export function CandidateRow({
  candidate,
  selected,
  onSelect,
  onTest,
  onHighlight,
}: {
  candidate: SelectorCandidate
  selected: boolean
  onSelect: () => void
  onTest: () => void
  onHighlight: () => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <motion.div
      layout={!reduce}
      className={cn(
        'flex flex-col gap-1.5 rounded-md border p-2',
        selected && 'border-primary/50 bg-primary/5',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5">{candidate.expression}</code>
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        <CandidateBadges candidate={candidate} />
        <span className="text-[10px] text-muted-foreground">{statusLabel(candidate)}</span>
        <span className="ml-auto flex items-center gap-0.5">
          <CopyButton text={candidate.expression} />
          <Button size="icon-xs" variant="ghost" aria-label={t('studio.test')} onClick={onTest}>
            <PlayIcon />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label={t('studio.highlight')} onClick={onHighlight}>
            <HighlighterIcon />
          </Button>
        </span>
      </div>
    </motion.div>
  )
}
