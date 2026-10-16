import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/utils/cn'
import { getTextFormatter } from './logic'
import { TEXT_FORMAT_IDS, type TextFormatId, type TextFormatSelection } from './formatters/types'

interface FormatLanguageSelectProps {
  value: TextFormatSelection
  detectedFormat: TextFormatId
  onValueChange: (value: TextFormatSelection) => void
  className?: string
}

export function FormatLanguageSelect({
  value,
  detectedFormat,
  onValueChange,
  className,
}: FormatLanguageSelectProps) {
  const { t } = useTranslation()
  const detected = getTextFormatter(detectedFormat)

  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as TextFormatSelection)}>
      <SelectTrigger
        aria-label={t('text.formatSelection')}
        size="sm"
        className={cn(
          'h-8 w-[min(100%,11rem)] min-w-[8.75rem] shrink-0 gap-1.5 whitespace-nowrap shadow-none',
          className,
        )}
      >
        <SparklesIcon
          className={cn(
            'size-3.5 shrink-0',
            value === 'auto' ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-hidden
        />
        {value === 'auto' ? (
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <span className="shrink-0 font-medium">{t('text.format.autoShort')}</span>
            <span className="shrink-0 text-muted-foreground" aria-hidden>·</span>
            <Badge
              variant="outline"
              className={cn('h-5 max-w-[5.5rem] truncate px-1.5 text-[10px] font-medium', detected.badgeClassName)}
              title={t(detected.labelKey)}
            >
              {t(detected.labelKey)}
            </Badge>
          </span>
        ) : (
          <SelectValue placeholder={t('text.format.auto')} />
        )}
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[11rem]">
        <SelectGroup>
          <SelectLabel>{t('text.format.groupDetect')}</SelectLabel>
          <SelectItem value="auto" className="py-2">
            <span className="flex flex-col gap-0.5 leading-tight">
              <span className="font-medium">{t('text.format.auto')}</span>
              <span className="text-[10px] text-muted-foreground">{t('text.format.autoHint')}</span>
            </span>
          </SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{t('text.format.groupManual')}</SelectLabel>
          {TEXT_FORMAT_IDS.map((format) => (
            <SelectItem key={format} value={format}>
              {t(`text.format.${format}`)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
