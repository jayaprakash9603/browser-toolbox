import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileWarningIcon, ShieldAlertIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'

function parseDownloadContext(): { id: number | null; blocked: boolean; host: string; file: string } {
  const params = new URLSearchParams(window.location.search)
  const rawId = Number(params.get('id'))
  return {
    id: Number.isInteger(rawId) && rawId >= 0 && params.has('id') ? rawId : null,
    blocked: params.get('blocked') === '1',
    host: params.get('host') ?? '',
    file: params.get('file') ?? '',
  }
}

export function DownloadPrompt() {
  const { t } = useTranslation()
  const ctx = useMemo(() => parseDownloadContext(), [])
  const [busy, setBusy] = useState(false)

  // a framed prompt could be click-jacked into keeping a file
  if (window.top !== window) return null

  const decide = (keep: boolean) => {
    if (ctx.id == null) return
    setBusy(true)
    void sendMessage({ type: 'PROTECTION_DOWNLOAD_DECISION', id: ctx.id, keep }).finally(() =>
      window.close(),
    )
  }

  const Icon = ctx.blocked ? ShieldAlertIcon : FileWarningIcon

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-6 text-foreground">
      <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <Icon className="size-7 text-destructive" aria-hidden />
          <h1 className="text-base font-semibold">
            {ctx.blocked ? t('protection.download.blockedTitle') : t('protection.download.confirmTitle')}
          </h1>
        </div>
        <p className="mb-3 text-sm">
          {ctx.blocked ? t('protection.download.blockedBody') : t('protection.download.confirmBody')}
        </p>
        {ctx.file && (
          <p className="mb-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{ctx.file}</p>
        )}
        {ctx.host && (
          <p className="mb-4 break-all text-xs text-muted-foreground">
            {t('protection.download.from', { host: ctx.host })}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {ctx.blocked || ctx.id == null ? (
            <Button type="button" onClick={() => window.close()}>
              {t('protection.download.ok')}
            </Button>
          ) : (
            <>
              <Button type="button" disabled={busy} onClick={() => decide(false)}>
                {t('protection.download.delete')}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => decide(true)}>
                {t('protection.download.keep')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
