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
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md gap-3 p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">{t('storage.addTitle')}</DialogTitle>
          <DialogDescription>{t('storage.addDescription', { area: areaLabel })}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t('storage.keyLabel')}
            <Input
              autoFocus
              value={key}
              onChange={(event) => setKey(event.target.value)}
              spellCheck={false}
              className="font-mono text-[12px]"
            />
            {overwrites && <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400">{t('storage.keyExists')}</span>}
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t('storage.editValue')}
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
              rows={5}
              aria-invalid={badJson}
              className={cn(
                'scrollbar-styled resize-y rounded-md border bg-background p-2 font-mono text-[11px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring',
                badJson && 'border-red-500/60',
              )}
            />
            {badJson && <span className="text-[11px] font-normal text-red-500">{t('storage.invalidJson')}</span>}
          </label>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t('storage.cancel')}
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
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm gap-3 p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">{t('storage.clearTitle', { area: areaLabel })}</DialogTitle>
          <DialogDescription>{t('storage.clearDescription', { count })}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('storage.cancel')}
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            {t('storage.clearConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
