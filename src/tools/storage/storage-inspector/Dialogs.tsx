import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { parseJson } from '@/core/storage-inspector/model'
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
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

export function AddEntryDialog({
  open,
  areaLabel,
  existingKeys,
  onClose,
  onSubmit,
}: {
  open: boolean
  areaLabel: string
  existingKeys: ReadonlySet<string>
  onClose: () => void
  onSubmit: (key: string, value: string) => void
}) {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) {
      setKey('')
      setValue('')
    }
  }, [open])

  const trimmed = key.trim()
  const overwrites = trimmed !== '' && existingKeys.has(trimmed)
  const looksJson = /^\s*[[{]/.test(value)
  const badJson = looksJson && parseJson(value) === undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (trimmed) onSubmit(trimmed, value)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-xs">
        <form className="grid gap-3" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t('storage.addTitleArea', { area: areaLabel })}</DialogTitle>
          </DialogHeader>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium">{t('storage.keyLabel')}</span>
            <Input
              autoFocus
              value={key}
              onChange={(event) => setKey(event.target.value)}
              spellCheck={false}
              className="h-8 font-mono text-xs"
            />
            {overwrites && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">{t('storage.keyExists')}</span>
            )}
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium">{t('storage.editValue')}</span>
            <Textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
              rows={3}
              aria-invalid={badJson}
              className={cn('min-h-[4.5rem] resize-y font-mono text-xs leading-relaxed', badJson && 'border-red-500/60')}
            />
            {badJson && <span className="text-[11px] text-red-500">{t('storage.invalidJson')}</span>}
          </label>
          <DialogFooter>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={!trimmed}>
              {t('storage.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClearAreaDialog({
  open,
  areaLabel,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean
  areaLabel: string
  count: number
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{t('storage.clearTitle', { area: areaLabel })}</DialogTitle>
          <DialogDescription>{t('storage.clearDescription', { count })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirm}>
            {t('storage.clearConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
