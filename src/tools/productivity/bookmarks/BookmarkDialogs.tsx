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

import { FolderSelect } from './FolderSelect'
import type { BookmarkFolder, BookmarkRow } from './service'

export interface BookmarkFormValues {
  title: string
  url: string
  parentId: string
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
  mode: 'create' | 'rename'
  folder?: BookmarkFolder
  name: string
  parentId: string
}

interface BookmarkFormDialogProps {
  draft: BookmarkDraft | null
  folders: readonly BookmarkFolder[]
  onClose: () => void
  onSubmit: (values: BookmarkFormValues, draft: BookmarkDraft) => void
}

export function BookmarkFormDialog({ draft, folders, onClose, onSubmit }: BookmarkFormDialogProps) {
  const { t } = useTranslation()
  const title = draft?.mode === 'edit' ? t('bookmarks.editDialogTitle') : t('bookmarks.createDialogTitle')
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {draft && <BookmarkForm key={draft.key} draft={draft} folders={folders} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function BookmarkForm({
  draft,
  folders,
  onClose,
  onSubmit,
}: Omit<BookmarkFormDialogProps, 'draft'> & { draft: BookmarkDraft }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(draft.title)
  const [url, setUrl] = useState(draft.url)
  const [parentId, setParentId] = useState(draft.parentId)
  const [touched, setTouched] = useState(false)
  const urlValid = /^https?:\/\//i.test(url.trim())
  const valid = urlValid && title.trim().length > 0

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (valid) onSubmit({ title: title.trim(), url: url.trim(), parentId }, draft)
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="bookmark-title">{t('bookmarks.fieldTitle')}</Label>
        <Input id="bookmark-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <FolderSelect id="bookmark-folder" folders={folders} value={parentId} onValueChange={setParentId} />
      </div>
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
  const title = draft?.mode === 'rename' ? t('bookmarks.folderDialogRename') : t('bookmarks.folderDialogCreate')
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {draft && <FolderForm key={draft.key} draft={draft} folders={folders} onClose={onClose} onSubmit={onSubmit} />}
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
      {draft.mode === 'create' && (
        <div className="grid gap-1.5">
          <Label htmlFor="folder-parent">{t('bookmarks.fieldParentFolder')}</Label>
          <FolderSelect id="folder-parent" folders={folders} value={parentId} onValueChange={setParentId} />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>
          {draft.mode === 'rename' ? t('bookmarks.saveChanges') : t('bookmarks.createFolder')}
        </Button>
      </DialogFooter>
    </form>
  )
}
