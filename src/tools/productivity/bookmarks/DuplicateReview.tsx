import { useTranslation } from 'react-i18next'

import type { DuplicateGroup } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { bookmarkDomain, type BookmarkRow } from './service'

export function DuplicateReview({
  groups,
  onKeep,
  onMerge,
  onKeepBoth,
}: {
  groups: readonly DuplicateGroup[]
  onKeep: (keeper: BookmarkRow, drop: BookmarkRow[]) => void
  onMerge: (keeper: BookmarkRow, drop: BookmarkRow[]) => void
  onKeepBoth: () => void
}) {
  const { t } = useTranslation()
  if (!groups.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('bookmarks.dupes.empty')}</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <section key={group.id} className="rounded-[var(--radius)] border p-2.5">
          <h3 className="text-[12px] font-semibold">{t(`bookmarks.dupes.kind.${group.kind}`)}</h3>
          <ul className="mt-1.5 space-y-2">
            {group.rows.map((row) => (
              <li key={row.id} className="rounded-lg bg-muted/40 p-2">
                <p className="truncate text-[13px] font-medium">{row.title}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{row.url}</p>
                <p className="text-[11px] text-muted-foreground">
                  {bookmarkDomain(row.url)} · {row.folderPath}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Button size="xs" variant="outline" onClick={() => onKeep(row, group.rows.filter((item) => item.id !== row.id))}>
                    {t('bookmarks.dupes.keepThis')}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onMerge(row, group.rows.filter((item) => item.id !== row.id))}
                  >
                    {t('bookmarks.dupes.merge')}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={onKeepBoth}>
                    {t('bookmarks.dupes.keepBoth')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
