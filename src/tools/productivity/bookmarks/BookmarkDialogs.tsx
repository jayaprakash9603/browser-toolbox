import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

import type { BookmarkWorkspace, ReadingPriority, ReadingStatus } from '@/core/bookmarks'

import { BookmarkOverlayFields } from './BookmarkOverlayFields'
import { FolderSelect } from './FolderSelect'
import type { BookmarkFolder, BookmarkRow } from './service'

export interface BookmarkFormValues {
  title: string
  url: string
  parentId: string
  notes: string
  description: string
  tagIds: string[]
  collectionIds: string[]
  readingStatus: ReadingStatus | ''
  priority: ReadingPriority
  reminderAt: string
}

export interface BookmarkDraft {
  key: string
  mode: 'create' | 'edit'
  row?: BookmarkRow
  title: string
  url: string
  parentId: string
}

export interface FolderDraft {
  key: string
  mode: 'create' | 'rename' | 'move'
  folder?: BookmarkFolder
  name: string
  parentId: string
  excludeIds?: ReadonlySet<string>
}

interface BookmarkFormDialogProps {
  draft: BookmarkDraft | null
  folders: readonly BookmarkFolder[]
  workspace: BookmarkWorkspace
  onClose: () => void
  onSubmit: (values: BookmarkFormValues, draft: BookmarkDraft) => void
  onCreateTag: (name: string) => string
}

export function BookmarkFormDialog({ draft, folders, workspace, onClose, onSubmit, onCreateTag }: BookmarkFormDialogProps) {
  const { t } = useTranslation()
  const title =
    draft?.mode === 'edit' ? t('bookmarks.editDialogTitle') : t('bookmarks.createDialogTitle')
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {draft && (
          <BookmarkForm
            key={draft.key}
            draft={draft}
            folders={folders}
            workspace={workspace}
            onClose={onClose}
            onSubmit={onSubmit}
            onCreateTag={onCreateTag}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BookmarkForm({
  draft,
  folders,
  workspace,
  onClose,
  onSubmit,
  onCreateTag,
}: Omit<BookmarkFormDialogProps, 'draft'> & { draft: BookmarkDraft }) {
  const { t } = useTranslation()
  const meta = draft.row ? workspace.items[draft.row.id] : undefined
  const [title, setTitle] = useState(draft.title)
  const [url, setUrl] = useState(draft.url)
  const [parentId, setParentId] = useState(draft.parentId)
  const [notes, setNotes] = useState(meta?.notes ?? '')
  const [description, setDescription] = useState(meta?.description ?? '')
  const [tagIds, setTagIds] = useState<string[]>(meta?.tagIds ?? [])
  const [collectionIds, setCollectionIds] = useState<string[]>(meta?.collectionIds ?? [])
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | ''>(meta?.readingStatus ?? '')
  const [priority, setPriority] = useState<ReadingPriority>(meta?.priority ?? 'normal')
  const [reminderAt, setReminderAt] = useState(
    meta?.reminderAt ? new Date(meta.reminderAt).toISOString().slice(0, 16) : '',
  )
  const [touched, setTouched] = useState(false)
  const urlValid = /^https?:\/\//i.test(url.trim())
  const valid = urlValid && title.trim().length > 0
  const values = (): BookmarkFormValues => ({
    title: title.trim(),
    url: url.trim(),
    parentId,
    notes,
    description,
    tagIds,
    collectionIds,
    readingStatus,
    priority,
    reminderAt,
  })

  return (
    <form
      className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (valid) onSubmit(values(), draft)
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-title">{t('bookmarks.fieldTitle')}</Label>
        <Input
          id="bookmark-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-url">{t('bookmarks.fieldUrl')}</Label>
        <Input
          id="bookmark-url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          className="font-mono text-xs"
          aria-invalid={touched && !urlValid}
          aria-describedby={touched && !urlValid ? 'bookmark-url-error' : undefined}
        />
        {touched && !urlValid && (
          <p id="bookmark-url-error" role="alert" className="text-[11px] text-destructive">
            {t('bookmarks.invalidUrl')}
          </p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-folder">{t('bookmarks.fieldFolder')}</Label>
        <FolderSelect
          id="bookmark-folder"
          folders={folders}
          value={parentId}
          onValueChange={setParentId}
        />
      </div>
      <BookmarkOverlayFields
        workspace={workspace}
        notes={notes}
        description={description}
        tagIds={tagIds}
        collectionIds={collectionIds}
        readingStatus={readingStatus}
        priority={priority}
        reminderAt={reminderAt}
        onNotes={setNotes}
        onDescription={setDescription}
        onToggleTag={(id) =>
          setTagIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
        }
        onCreateTag={(name) => {
          const id = onCreateTag(name)
          setTagIds((current) => [...current, id])
        }}
        onToggleCollection={(id) =>
          setCollectionIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
        }
        onReadingStatus={setReadingStatus}
        onPriority={setPriority}
        onReminder={setReminderAt}
      />
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm">
          {draft.mode === 'edit' ? t('bookmarks.saveChanges') : t('bookmarks.create')}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface FolderFormDialogProps {
  draft: FolderDraft | null
  folders: readonly BookmarkFolder[]
  onClose: () => void
  onSubmit: (name: string, parentId: string, draft: FolderDraft) => void
}

export function FolderFormDialog({ draft, folders, onClose, onSubmit }: FolderFormDialogProps) {
  const { t } = useTranslation()
  const title =
    draft?.mode === 'rename'
      ? t('bookmarks.folderDialogRename')
      : draft?.mode === 'move'
        ? t('bookmarks.folderDialogMove')
        : t('bookmarks.folderDialogCreate')
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {draft && (
          <FolderForm
            key={draft.key}
            draft={draft}
            folders={folders}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FolderForm({
  draft,
  folders,
  onClose,
  onSubmit,
}: Omit<FolderFormDialogProps, 'draft'> & { draft: FolderDraft }) {
  const { t } = useTranslation()
  const [name, setName] = useState(draft.name)
  const [parentId, setParentId] = useState(draft.parentId)

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (name.trim()) onSubmit(name.trim(), parentId, draft)
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="folder-name">{t('bookmarks.fieldFolderName')}</Label>
        <Input id="folder-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {draft.mode !== 'rename' && (
        <div className="grid gap-1.5">
          <Label htmlFor="folder-parent">{t('bookmarks.fieldParentFolder')}</Label>
          <FolderSelect
            id="folder-parent"
            folders={folders}
            value={parentId}
            onValueChange={setParentId}
            excludeIds={draft.excludeIds}
          />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>
          {draft.mode === 'create' ? t('bookmarks.createFolder') : t('bookmarks.saveChanges')}
        </Button>
      </DialogFooter>
    </form>
  )
}
