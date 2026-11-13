import { useTranslation } from 'react-i18next'

import type { BookmarkWorkspace, ReadingPriority, ReadingStatus } from '@/core/bookmarks'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

import { CollectionSelector } from './CollectionSelector'
import { TagSelector } from './TagSelector'

export function BookmarkOverlayFields({
  workspace,
  notes,
  description,
  tagIds,
  collectionIds,
  readingStatus,
  priority,
  reminderAt,
  onNotes,
  onDescription,
  onToggleTag,
  onCreateTag,
  onToggleCollection,
  onReadingStatus,
  onPriority,
  onReminder,
}: {
  workspace: BookmarkWorkspace
  notes: string
  description: string
  tagIds: string[]
  collectionIds: string[]
  readingStatus: ReadingStatus | ''
  priority: ReadingPriority
  reminderAt: string
  onNotes: (value: string) => void
  onDescription: (value: string) => void
  onToggleTag: (id: string) => void
  onCreateTag: (name: string) => void
  onToggleCollection: (id: string) => void
  onReadingStatus: (value: ReadingStatus | '') => void
  onPriority: (value: ReadingPriority) => void
  onReminder: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid gap-1.5">
        <Label>{t('bookmarks.fieldTags')}</Label>
        <TagSelector
          tags={Object.values(workspace.tags)}
          selected={tagIds}
          onToggle={onToggleTag}
          onCreate={onCreateTag}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>{t('bookmarks.fieldCollections')}</Label>
        <CollectionSelector
          collections={Object.values(workspace.collections)}
          selected={collectionIds}
          onToggle={onToggleCollection}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-description">{t('bookmarks.fieldDescription')}</Label>
        <Input id="bookmark-description" value={description} onChange={(event) => onDescription(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-notes">{t('bookmarks.fieldNotes')}</Label>
        <Textarea id="bookmark-notes" value={notes} onChange={(event) => onNotes(event.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[11px]">
          {t('bookmarks.fieldReading')}
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={readingStatus}
            onChange={(event) => onReadingStatus(event.target.value as ReadingStatus | '')}
          >
            <option value="">{t('bookmarks.reading.none')}</option>
            <option value="unread">{t('bookmarks.reading.unread')}</option>
            <option value="reading">{t('bookmarks.reading.reading')}</option>
            <option value="completed">{t('bookmarks.reading.completed')}</option>
            <option value="archived">{t('bookmarks.reading.archived')}</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px]">
          {t('bookmarks.fieldPriority')}
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={priority}
            onChange={(event) => onPriority(event.target.value as ReadingPriority)}
          >
            <option value="low">{t('bookmarks.priority.low')}</option>
            <option value="normal">{t('bookmarks.priority.normal')}</option>
            <option value="high">{t('bookmarks.priority.high')}</option>
          </select>
        </label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-reminder">{t('bookmarks.fieldReminder')}</Label>
        <Input
          id="bookmark-reminder"
          type="datetime-local"
          value={reminderAt}
          onChange={(event) => onReminder(event.target.value)}
        />
      </div>
    </>
  )
}
