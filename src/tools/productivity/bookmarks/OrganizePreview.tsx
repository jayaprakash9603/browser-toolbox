import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OrganizeSuggestion } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import type { BookmarkRow } from './service'

export function OrganizePreview({
  suggestions,
  rows,
  onApply,
}: {
  suggestions: readonly OrganizeSuggestion[]
  rows: readonly BookmarkRow[]
  onApply: (selected: OrganizeSuggestion[]) => void
}) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const selected = picked ?? new Set(suggestions.map((item) => item.id))
  if (!suggestions.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('bookmarks.organize.empty')}</p>
  }
  const byId = new Map(rows.map((row) => [row.id, row]))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => onApply(suggestions.filter((item) => selected.has(item.id)))}>
          {t('bookmarks.organize.acceptAll')}
        </Button>
      </div>
      {suggestions.map((item) => {
        const row = byId.get(item.bookmarkId)
        return (
          <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg border p-2">
            <Checkbox
              checked={selected.has(item.id)}
              onCheckedChange={(value) => {
                const next = new Set(selected)
                if (value === true) next.add(item.id)
                else next.delete(item.id)
                setPicked(next)
              }}
            />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{row?.title ?? item.bookmarkId}</span>
              <span className="text-[11px] text-muted-foreground">
                {t(`bookmarks.organize.kind.${item.kind}`)} · {item.reason}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
