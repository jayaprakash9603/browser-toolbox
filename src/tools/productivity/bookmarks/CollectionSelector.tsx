import { useTranslation } from 'react-i18next'

import { COLLECTION_COLOR_CLASS, type BookmarkCollection } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

export function CollectionSelector({
  collections,
  selected,
  onToggle,
}: {
  collections: readonly BookmarkCollection[]
  selected: readonly string[]
  onToggle: (id: string) => void
}) {
  const { t } = useTranslation()
  if (!collections.length) {
    return <p className="text-[11px] text-muted-foreground">{t('bookmarks.collection.empty')}</p>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {collections.map((collection) => (
        <button
          key={collection.id}
          type="button"
          onClick={() => onToggle(collection.id)}
          className={cn(
            'h-7 cursor-pointer rounded-full px-2 text-[11px] font-medium',
            selected.includes(collection.id)
              ? COLLECTION_COLOR_CLASS[collection.color]
              : 'bg-muted text-muted-foreground',
          )}
        >
          {collection.name}
        </button>
      ))}
    </div>
  )
}
