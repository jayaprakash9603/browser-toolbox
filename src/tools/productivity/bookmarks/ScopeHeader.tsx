import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, PencilIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

export function ScopeHeader({
  title,
  onBack,
  onEdit,
  onDelete,
}: {
  title: string
  onBack: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-2 flex items-center gap-1">
      <Button size="icon-sm" variant="ghost" className="size-11" aria-label={t('bookmarks.up')} onClick={onBack}>
        <ChevronLeftIcon />
      </Button>
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
      {onEdit && (
        <Button size="icon-sm" variant="ghost" className="size-11" aria-label={t('bookmarks.edit')} onClick={onEdit}>
          <PencilIcon />
        </Button>
      )}
      {onDelete && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-11 text-destructive"
          aria-label={t('bookmarks.delete')}
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      )}
    </div>
  )
}
