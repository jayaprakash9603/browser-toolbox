import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import type { BookmarkTag } from '@/core/bookmarks'

export function BulkBar({
  count,
  tags,
  onTag,
  onClear,
}: {
  count: number
  tags: readonly BookmarkTag[]
  onTag: (tagId: string) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  if (!count) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5">
      <span className="text-[11px] font-medium">{t('bookmarks.bulk.count', { count })}</span>
      {tags.slice(0, 6).map((tag) => (
        <Button key={tag.id} size="xs" variant="outline" onClick={() => onTag(tag.id)}>
          {tag.name}
        </Button>
      ))}
      <Button size="xs" variant="ghost" className="ml-auto" onClick={onClear}>
        {t('bookmarks.bulk.clear')}
      </Button>
    </div>
  )
}
