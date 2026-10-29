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
import { Textarea } from '@/shared/components/ui/textarea'

import { parseReadingTags, type ReadingItem } from './model'

interface ReadingEditDialogProps {
  item: ReadingItem | null
  onClose: () => void
  onSave: (id: string, changes: Pick<ReadingItem, 'title' | 'url' | 'note' | 'tags'>) => void
}

export function ReadingEditDialog({ item, onClose, onSave }: ReadingEditDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('readingList.editDialogTitle')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('readingList.editDialogTitle')}
          </DialogDescription>
        </DialogHeader>
        {item && <EditForm key={item.id} item={item} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({
  item,
  onClose,
  onSave,
}: {
  item: ReadingItem
  onClose: () => void
  onSave: ReadingEditDialogProps['onSave']
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(item.title)
  const [url, setUrl] = useState(item.url)
  const [note, setNote] = useState(item.note)
  const [tagsText, setTagsText] = useState(item.tags.join(', '))
  const valid = /^https?:\/\//i.test(url.trim())

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid) return
        onSave(item.id, {
          title: title.trim() || url.trim(),
          url: url.trim(),
          note: note.trim(),
          tags: parseReadingTags(tagsText),
        })
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="reading-title">{t('readingList.fieldTitle')}</Label>
        <Input id="reading-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="reading-url">{t('readingList.fieldUrl')}</Label>
        <Input
          id="reading-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-xs"
          aria-invalid={!valid}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="reading-note">{t('readingList.fieldNote')}</Label>
        <Textarea
          id="reading-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-20 text-xs"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="reading-tags">{t('readingList.fieldTags')}</Label>
        <Input id="reading-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!valid}>
          {t('readingList.saveChanges')}
        </Button>
      </DialogFooter>
    </form>
  )
}
