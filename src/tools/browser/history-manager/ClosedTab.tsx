import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcwIcon } from 'lucide-react'

import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/components/toast/useToast'

import {
  getRecentlyClosed,
  requestSessionsPermission,
  restoreSession,
  sessionsApiAvailable,
} from './service'

export function ClosedTab() {
  const { t } = useTranslation()
  const { show } = useToast()
  const [sessions, setSessions] = useState<chrome.sessions.Session[]>([])
  const [loading, setLoading] = useState(true)
  const [granted, setGranted] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const ok = await sessionsApiAvailable()
    setGranted(ok)
    if (!ok) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setSessions((await getRecentlyClosed()) ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const request = async () => {
    const ok = await requestSessionsPermission()
    setGranted(ok)
    if (ok) void load()
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-xs text-muted-foreground">{t('historyManager.closed.note')}</p>
      {granted === false && (
        <PermissionNotice
          active
          permissions={['sessions']}
          origins={[]}
          message={t('historyManager.sessionsPermission')}
        />
      )}
      {granted === false && (
        <Button type="button" size="sm" onClick={() => void request()}>
          {t('siteAccess.allow')}
        </Button>
      )}
      {loading && <p className="text-sm text-muted-foreground">{t('historyManager.loading')}</p>}
      {!loading && granted && sessions.length === 0 && (
        <EmptyState icon={RotateCcwIcon} title={t('historyManager.closed.empty')} />
      )}
      <ul className="space-y-2">
        {sessions.map((session, index) => {
          const tab = session.tab
          const window = session.window
          const title = tab?.title ?? (window ? `Window (${window.tabs?.length ?? 0} tabs)` : 'Session')
          const url = tab?.url
          return (
            <li
              key={session.tab?.sessionId ?? session.window?.sessionId ?? String(index)}
              className="flex items-center gap-2 rounded-lg border bg-card px-2 py-2 shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                {url && <p className="truncate text-xs text-muted-foreground">{url}</p>}
              </div>
              <Button
                type="button"
                size="xs"
                onClick={async () => {
                  const id = session.tab?.sessionId ?? session.window?.sessionId
                  if (!id) return
                  await restoreSession(id)
                  show(t('historyManager.closed.restored'))
                  void load()
                }}
              >
                {t('historyManager.closed.restore')}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
