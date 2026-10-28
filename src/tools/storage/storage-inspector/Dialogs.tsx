import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { parseJson } from '@/core/storage-inspector/model'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

export function AddEntryForm({
  areaLabel,
  existingKeys,
  onClose,
  onSubmit,
}: {
  areaLabel: string
  existingKeys: ReadonlySet<string>
  onClose: () => void
  onSubmit: (key: string, value: string) => void
}) {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')

  useEffect(() => {
    setKey('')
    setValue('')
  }, [areaLabel])

  const trimmed = key.trim()
  const overwrites = trimmed !== '' && existingKeys.has(trimmed)
  const looksJson = /^\s*[[{]/.test(value)
  const badJson = looksJson && parseJson(value) === undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (trimmed) onSubmit(trimmed, value)
  }

  return (
    <form className="grid gap-2.5" onSubmit={submit}>
      <p className="text-sm font-semibold leading-5">{t('storage.addTitleArea', { area: areaLabel })}</p>
      <label className="grid gap-1">
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
      <label className="grid gap-1">
        <span className="text-xs font-medium">{t('storage.editValue')}</span>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          spellCheck={false}
          rows={2}
          aria-invalid={badJson}
          className={cn('min-h-0 resize-y font-mono text-xs leading-relaxed', badJson && 'border-red-500/60')}
        />
        {badJson && <span className="text-[11px] text-red-500">{t('storage.invalidJson')}</span>}
      </label>
      <div className="flex justify-end gap-2 pt-0.5">
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!trimmed}>
          {t('storage.create')}
        </Button>
      </div>
    </form>
  )
}
