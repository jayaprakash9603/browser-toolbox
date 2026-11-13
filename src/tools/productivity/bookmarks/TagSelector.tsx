import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { COLLECTION_COLOR_CLASS, type BookmarkTag, type CollectionColor } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

export function TagSelector({
  tags,
  selected,
  onToggle,
  onCreate,
}: {
  tags: readonly BookmarkTag[]
  selected: readonly string[]
  onToggle: (id: string) => void
  onCreate: (name: string) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const filtered = useMemo(() => {
    const q = draft.trim().toLowerCase()
    return q ? tags.filter((tag) => tag.name.toLowerCase().includes(q)) : tags
  }, [tags, draft])
  return (
    <div className="grid gap-1.5">
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('bookmarks.tag.placeholder')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft.trim()) {
              event.preventDefault()
              onCreate(draft.trim())
              setDraft('')
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!draft.trim()}
          onClick={() => {
            onCreate(draft.trim())
            setDraft('')
          }}
        >
          {t('bookmarks.tag.create')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {filtered.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={cn(
              'h-7 cursor-pointer rounded-full px-2 text-[11px] font-medium',
              selected.includes(tag.id)
                ? COLLECTION_COLOR_CLASS[tag.color as CollectionColor]
                : 'bg-muted text-muted-foreground',
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  )
}
