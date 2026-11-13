import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'

import type { HistoryContentType, HistoryFilters, HistoryVisitActivity } from '@/core/history-manager'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

interface HistoryFiltersPanelProps {
  open: boolean
  filters: HistoryFilters
  domainOptions: string[]
  onPatch: (patch: Partial<HistoryFilters>) => void
  onClear: () => void
}

const ACTIVITY: HistoryVisitActivity[] = ['all', 'most', 'recent', 'frequent', 'single']
const CONTENT: HistoryContentType[] = ['all', 'webpage', 'image', 'pdf', 'video', 'audio', 'download']

export function HistoryFiltersPanel({ open, filters, domainOptions, onPatch, onClear }: HistoryFiltersPanelProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  if (!open) return null
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex flex-col gap-2.5 overflow-hidden rounded-xl border border-border/70 bg-muted/25 p-3 shadow-xs"
    >
      <Label className="text-xs">{t('historyManager.filter.activity')}</Label>
      <ChoiceChips
        ariaLabel={t('historyManager.filter.activity')}
        columns={3}
        value={filters.visitActivity}
        onValueChange={(v) => onPatch({ visitActivity: v })}
        options={ACTIVITY.map((value) => ({
          value,
          label: t(`historyManager.activity.${value}`),
        }))}
      />
      <Label className="text-xs">{t('historyManager.filter.content')}</Label>
      <ChoiceChips
        ariaLabel={t('historyManager.filter.content')}
        columns={3}
        value={filters.contentType}
        onValueChange={(v) => onPatch({ contentType: v })}
        options={CONTENT.map((value) => ({
          value,
          label: t(`historyManager.content.${value}`),
        }))}
      />
      <Label className="text-xs">{t('historyManager.filter.domains')}</Label>
      <Select
        value={filters.domains[0] ?? 'all'}
        onValueChange={(v) => onPatch({ domains: v === 'all' ? [] : [v] })}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('bookmarks.allSites')}</SelectItem>
          {domainOptions.slice(0, 200).map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="xs" variant="ghost" onClick={onClear}>
        {t('historyManager.clearFilters')}
      </Button>
    </motion.div>
  )
}
