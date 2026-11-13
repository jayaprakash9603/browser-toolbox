import { useTranslation } from 'react-i18next'

import type { ImportPreview as Preview } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { FolderSelect } from './FolderSelect'
import type { BookmarkFolder } from './service'

export function ImportPreviewPanel({
  preview,
  folders,
  destination,
  skipDupes,
  onDestination,
  onSkipDupes,
  onToggle,
  onConfirm,
  onClose,
}: {
  preview: Preview
  folders: readonly BookmarkFolder[]
  destination: string
  skipDupes: boolean
  onDestination: (id: string) => void
  onSkipDupes: (value: boolean) => void
  onToggle: (index: number, selected: boolean) => void
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const count = preview.selected.filter(Boolean).length
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {t('bookmarks.import.preview', {
          count: preview.bookmarks.length,
          folders: preview.folders.length,
          duplicates: preview.duplicates,
        })}
      </p>
      <Label>{t('bookmarks.fieldFolder')}</Label>
      <FolderSelect folders={folders} value={destination} onValueChange={onDestination} />
      <label className="flex items-center justify-between gap-2 text-[12px]">
        {t('bookmarks.import.skipDupes')}
        <Switch checked={skipDupes} onCheckedChange={onSkipDupes} />
      </label>
      <div className="max-h-56 space-y-1 overflow-auto">
        {preview.bookmarks.map((row, index) => (
          <label key={`${row.url}-${index}`} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/40">
            <Checkbox checked={preview.selected[index]} onCheckedChange={(value) => onToggle(index, value === true)} />
            <span className="min-w-0">
              <span className="block truncate text-[13px]">{row.title}</span>
              <span className="block truncate font-mono text-[10px] text-muted-foreground">{row.url}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" disabled={!count} onClick={onConfirm}>
          {t('bookmarks.import.confirm')}
        </Button>
      </div>
    </div>
  )
}
