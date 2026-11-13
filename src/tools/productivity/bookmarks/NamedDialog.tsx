import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CollectionColor } from '@/core/bookmarks'
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

import { COLLECTION_ICON_IDS, CollectionIcon } from './CollectionIcon'
import { ColorSwatches } from './ColorSwatches'

export interface NamedDraft {
  key: string
  kind: 'collection' | 'project'
  id?: string
  name: string
  icon: string
  color: CollectionColor
}

export function NamedDialog({
  draft,
  onClose,
  onSubmit,
}: {
  draft: NamedDraft | null
  onClose: () => void
  onSubmit: (draft: NamedDraft) => void
}) {
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {draft && <NamedForm key={draft.key} draft={draft} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function NamedForm({
  draft,
  onClose,
  onSubmit,
}: {
  draft: NamedDraft
  onClose: () => void
  onSubmit: (draft: NamedDraft) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(draft.name)
  const [icon, setIcon] = useState(draft.icon)
  const [color, setColor] = useState(draft.color)
  const title =
    draft.kind === 'collection'
      ? t(draft.id ? 'bookmarks.collection.updated' : 'bookmarks.newCollection')
      : t(draft.id ? 'bookmarks.project.updated' : 'bookmarks.newProject')
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (name.trim()) onSubmit({ ...draft, name: name.trim(), icon, color })
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
      </DialogHeader>
      <Label htmlFor="named-title">
        {draft.kind === 'collection' ? t('bookmarks.collection.name') : t('bookmarks.project.name')}
      </Label>
      <Input id="named-title" autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      {draft.kind === 'collection' && (
        <div className="flex flex-wrap gap-1">
          {COLLECTION_ICON_IDS.map((id) => (
            <button key={id} type="button" onClick={() => setIcon(id)} className="cursor-pointer">
              <CollectionIcon icon={id} color={color} className={icon === id ? 'ring-2 ring-ring' : ''} />
            </button>
          ))}
        </div>
      )}
      <ColorSwatches value={color} onChange={setColor} />
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>
          {t('bookmarks.saveChanges')}
        </Button>
      </DialogFooter>
    </form>
  )
}
