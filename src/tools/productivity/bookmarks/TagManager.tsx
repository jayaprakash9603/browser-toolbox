import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { COLLECTION_COLOR_CLASS, type BookmarkTag, type BookmarkWorkspace } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

export function TagManager({
  workspace,
  onFilter,
  onRename,
  onMerge,
  onDelete,
  onCreate,
}: {
  workspace: BookmarkWorkspace
  onFilter: (id: string) => void
  onRename: (id: string, name: string) => void
  onMerge: (keepId: string, dropId: string) => void
  onDelete: (id: string) => void
  onCreate: (name: string) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const tags = useMemo(() => Object.values(workspace.tags), [workspace.tags])
  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of Object.values(workspace.items)) {
      for (const id of item.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [workspace.items])
  if (!tags.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('bookmarks.tag.empty')}</p>
  }
  const ranked = [...tags].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t('bookmarks.tag.placeholder')} />
        <Button size="sm" disabled={!draft.trim()} onClick={() => { onCreate(draft.trim()); setDraft('') }}>
          {t('bookmarks.tag.create')}
        </Button>
      </div>
      {ranked.map((tag) => (
        <TagRow
          key={tag.id}
          tag={tag}
          count={usage.get(tag.id) ?? 0}
          others={tags.filter((item) => item.id !== tag.id)}
          onFilter={onFilter}
          onRename={onRename}
          onMerge={onMerge}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function TagRow({
  tag,
  count,
  others,
  onFilter,
  onRename,
  onMerge,
  onDelete,
}: {
  tag: BookmarkTag
  count: number
  others: BookmarkTag[]
  onFilter: (id: string) => void
  onRename: (id: string, name: string) => void
  onMerge: (keepId: string, dropId: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(tag.name)
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border p-2">
      <button
        type="button"
        onClick={() => onFilter(tag.id)}
        className={cn('h-7 cursor-pointer rounded-full px-2 text-[11px] font-medium', COLLECTION_COLOR_CLASS[tag.color])}
      >
        {tag.name}
      </button>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {count === 0 ? t('bookmarks.tag.unused') : count}
      </span>
      <Input className="h-8 min-w-0 flex-1" value={name} onChange={(event) => setName(event.target.value)} />
      <Button size="xs" variant="outline" onClick={() => onRename(tag.id, name)}>
        {t('bookmarks.tag.rename')}
      </Button>
      {others[0] && (
        <Button size="xs" variant="outline" onClick={() => onMerge(others[0].id, tag.id)}>
          {t('bookmarks.tag.merge')}
        </Button>
      )}
      <Button size="xs" variant="ghost" className="text-destructive" onClick={() => onDelete(tag.id)}>
        {t('bookmarks.delete')}
      </Button>
    </div>
  )
}
