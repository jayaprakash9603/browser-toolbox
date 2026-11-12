import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { RedirectLogEntry } from '@/core/protection'
import { sendMessage } from '@/core/messaging'

export function RedirectEventLog() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<RedirectLogEntry[]>([])

  useEffect(() => {
    void sendMessage({ type: 'PROTECTION_REDIRECT_GET_LOG' }).then((res) => {
      if (Array.isArray(res)) setEntries(res as RedirectLogEntry[])
      else setEntries((res as { entries?: RedirectLogEntry[] } | null)?.entries ?? [])
    })
  }, [])

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('protection.redirectLog.empty')}</p>
  }

  return (
    <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-md border bg-card px-2.5 py-1.5 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="truncate font-medium">
              {entry.sourceHost || '—'} → {entry.destHost || '—'}
            </span>
            <span className="shrink-0 text-muted-foreground">{entry.action}</span>
          </div>
          <p className="text-muted-foreground">
            {entry.classification} · {entry.risk} · {new Date(entry.at).toLocaleString()}
            {entry.falsePositive ? ` · ${t('protection.redirectLog.falsePositive')}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}
