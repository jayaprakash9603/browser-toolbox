import { useTranslation } from 'react-i18next'

import {
  RANGE_PRESETS,
  type HistoryContentType,
  type HistoryFilters,
  type HistoryRangePreset,
  type HistoryVisitActivity,
} from '@/core/history-manager'
import { FilterOptionList, FilterSection, FilterSheet } from '@/shared/components/FilterSheet'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
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
  onOpenChange: (open: boolean) => void
  onPatch: (patch: Partial<HistoryFilters>) => void
  onRangeChange: (range: HistoryRangePreset) => void
  onClear: () => void
}

const ACTIVITY: HistoryVisitActivity[] = ['all', 'most', 'recent', 'frequent', 'single']
const CONTENT: HistoryContentType[] = ['all', 'webpage', 'image', 'pdf', 'video', 'audio', 'download']

export function HistoryFiltersPanel({
  open,
  filters,
  domainOptions,
  onOpenChange,
  onPatch,
  onRangeChange,
  onClear,
}: HistoryFiltersPanelProps) {
  const { t } = useTranslation()

  return (
    <FilterSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('historyManager.filter.sheetTitle')}
      description={t('historyManager.filter.sheetDescription')}
      onClear={onClear}
      clearLabel={t('historyManager.clearFilters')}
    >
      <FilterSection label={t('historyManager.filter.range')} hint={t('historyManager.filter.rangeHint')}>
        <FilterOptionList
          ariaLabel={t('historyManager.filter.range')}
          value={filters.range}
          onValueChange={onRangeChange}
          options={RANGE_PRESETS.map((value) => ({
            value,
            label: t(`historyManager.range.${value}`),
          }))}
        />
      </FilterSection>

      <FilterSection label={t('historyManager.filter.activity')}>
        <ChoiceChips
          ariaLabel={t('historyManager.filter.activity')}
          columns={2}
          value={filters.visitActivity}
          onValueChange={(v) => onPatch({ visitActivity: v })}
          options={ACTIVITY.map((value) => ({
            value,
            label: t(`historyManager.activity.${value}`),
          }))}
        />
      </FilterSection>

      <FilterSection label={t('historyManager.filter.content')}>
        <ChoiceChips
          ariaLabel={t('historyManager.filter.content')}
          columns={2}
          value={filters.contentType}
          onValueChange={(v) => onPatch({ contentType: v })}
          options={CONTENT.map((value) => ({
            value,
            label: t(`historyManager.content.${value}`),
          }))}
        />
      </FilterSection>

      <FilterSection label={t('historyManager.filter.domains')}>
        <Label className="sr-only">{t('historyManager.filter.domains')}</Label>
        <Select
          value={filters.domains[0] ?? 'all'}
          onValueChange={(v) => onPatch({ domains: v === 'all' ? [] : [v] })}
        >
          <SelectTrigger className="h-11 min-h-11 w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            <SelectItem value="all">{t('bookmarks.allSites')}</SelectItem>
            {domainOptions.slice(0, 200).map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
    </FilterSheet>
  )
}
