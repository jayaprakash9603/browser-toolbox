import { SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: SearchInputProps) {
  const { t } = useTranslation()
  return (
    <div className={cn('relative', className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t('common.searchPlaceholder')}
        aria-label={ariaLabel ?? t('common.search')}
        className="min-h-8 pl-8"
      />
    </div>
  )
}
