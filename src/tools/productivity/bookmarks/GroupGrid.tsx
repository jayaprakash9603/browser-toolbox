import { useTranslation } from 'react-i18next'
import { PlusIcon } from 'lucide-react'

import { COLLECTION_COLOR_CLASS, type BookmarkCollection, type BookmarkProject } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { CollectionIcon } from './CollectionIcon'

export function CollectionGrid({
  collections,
  onOpen,
  onCreate,
}: {
  collections: readonly BookmarkCollection[]
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const { t } = useTranslation()
  if (!collections.length) {
    return <EmptyGroup title={t('bookmarks.collection.empty')} hint={t('bookmarks.collection.emptyHint')} onCreate={onCreate} />
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onCreate}>
          <PlusIcon />
          {t('bookmarks.add')}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-[var(--density-grid-gap)] @[420px]:grid-cols-2">
        {collections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => onOpen(collection.id)}
            className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border bg-card p-2.5 text-left hover:border-primary/30"
          >
            <CollectionIcon icon={collection.icon} color={collection.color} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{collection.name}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {t('bookmarks.itemCount', { count: collection.bookmarkIds.length })}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProjectGrid({
  projects,
  onOpen,
  onCreate,
}: {
  projects: readonly BookmarkProject[]
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const { t } = useTranslation()
  if (!projects.length) {
    return <EmptyGroup title={t('bookmarks.project.empty')} hint={t('bookmarks.project.emptyHint')} onCreate={onCreate} />
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onCreate}>
          <PlusIcon />
          {t('bookmarks.add')}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-[var(--density-grid-gap)]">
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          onClick={() => onOpen(project.id)}
          className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border bg-card p-2.5 text-left hover:border-primary/30"
        >
          <span className={cn('size-8 rounded-lg', COLLECTION_COLOR_CLASS[project.color])} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{project.name}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {t('bookmarks.itemCount', { count: project.bookmarkIds.length })}
            </span>
          </span>
        </button>
      ))}
      </div>
    </div>
  )
}

function EmptyGroup({ title, hint, onCreate }: { title: string; hint: string; onCreate: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>
      <Button size="sm" onClick={onCreate}>
        <PlusIcon />
        {t('bookmarks.add')}
      </Button>
    </div>
  )
}
