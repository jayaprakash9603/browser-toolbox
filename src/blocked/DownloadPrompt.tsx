import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon, FileWarningIcon, ShieldAlertIcon, Trash2Icon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'

import { DetailRow, ProtectionInterstitial } from './ProtectionInterstitial'

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

  useEffect(() => {
    document.title = ctx.blocked
      ? t('protection.download.blockedTitle')
      : t('protection.download.confirmTitle')
  }, [ctx.blocked, t])

  useEffect(() => {
    if (ctx.id == null) return
    const timer = window.setInterval(() => void sendMessage({ type: 'PROTECTION_GET_STATS' }), 20_000)
    return () => window.clearInterval(timer)
  }, [ctx.id])

  if (window.top !== window) return null

  const decide = (keep: boolean) => {
    if (ctx.id == null) return
    setBusy(true)
    void sendMessage({ type: 'PROTECTION_DOWNLOAD_DECISION', id: ctx.id, keep }).finally(() => window.close())
  }

  const Icon = ctx.blocked ? ShieldAlertIcon : FileWarningIcon
  const tone = ctx.blocked ? 'danger' : 'warning'

  const tips = ctx.blocked
    ? [t('protection.download.tipBlockedSafe')]
    : [t('protection.download.tipHeld'), t('protection.download.tipCloseDeletes')]

  return (
    <ProtectionInterstitial
      compact
      icon={Icon}
      tone={tone}
      badge={ctx.blocked ? t('protection.download.badgeBlocked') : t('protection.download.badgeHeld')}
      title={ctx.blocked ? t('protection.download.blockedTitle') : t('protection.download.confirmTitle')}
      description={ctx.blocked ? t('protection.download.blockedBody') : t('protection.download.confirmBody')}
      tips={tips}
      details={
        <>
          {ctx.file && (
            <div className="flex items-start gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border">
                <DownloadIcon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <DetailRow label={t('protection.download.fileLabel')} value={ctx.file} />
              </div>
            </div>
          )}
          {ctx.host && <DetailRow label={t('protection.download.sourceLabel')} value={ctx.host} />}
        </>
      }
      actions={
        ctx.blocked || ctx.id == null ? (
          <Button type="button" className="w-full" size="default" onClick={() => window.close()}>
            {t('protection.download.ok')}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={busy}
              onClick={() => decide(false)}
            >
              <Trash2Icon aria-hidden />
              {t('protection.download.delete')}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => decide(true)}>
              {t('protection.download.keep')}
            </Button>
            <p className="text-center text-[11px] leading-snug text-muted-foreground">
              {t('protection.download.footerHint')}
            </p>
          </>
        )
      }
    />
  )
}
