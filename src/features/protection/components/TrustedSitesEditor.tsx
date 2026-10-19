import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { addTrustedHost, removeTrustedHost } from '@/core/protection'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function TrustedSitesEditor({
  trusted,
  onChange,
}: {
  trusted: string[]
  onChange: (trusted: string[]) => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('protection.trusted.placeholder')}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={() => {
            void (async () => {
              const next = await addTrustedHost(value)
              onChange(next.trusted)
              setValue('')
            })()
          }}
        >
          {t('protection.trusted.add')}
        </Button>
      </div>
      {trusted.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('protection.trusted.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {trusted.map((host) => (
            <li key={host} className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
              <span>{host}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={() => {
                  void removeTrustedHost(host).then((s) => onChange(s.trusted))
                }}
              >
                {t('protection.trusted.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
