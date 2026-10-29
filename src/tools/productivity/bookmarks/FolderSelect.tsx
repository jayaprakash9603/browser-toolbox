import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/utils/cn'

import type { BookmarkFolder } from './service'

interface FolderSelectProps {
  folders: readonly BookmarkFolder[]
  value: string
  onValueChange: (value: string) => void
  allLabel?: string
  excludeIds?: ReadonlySet<string>
  id?: string
  ariaLabel?: string
  className?: string
}

export function FolderSelect({
  folders,
  value,
  onValueChange,
  allLabel,
  excludeIds,
  id,
  ariaLabel,
  className,
}: FolderSelectProps) {
  const { t } = useTranslation()
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={ariaLabel ?? t('bookmarks.fieldFolder')} className={cn('w-full', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value="all">{allLabel}</SelectItem>}
        {folders
          .filter((folder) => !excludeIds?.has(folder.id))
          .map((folder) => (
            <SelectItem
              key={folder.id}
              value={folder.id}
              className="pl-2"
              style={{ paddingLeft: 8 + folder.depth * 14 }}
            >
              {folder.title}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
