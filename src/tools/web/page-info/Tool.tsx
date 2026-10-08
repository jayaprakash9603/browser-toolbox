import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { CopyButton } from '@/shared/components/CopyButton'
import { useWebTool, getPageInfo } from '../_shared'
import type { PageInfo } from '@/chrome/content/index'

export default function PageInfoTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.page-info')
  const [info, setInfo] = useState<PageInfo | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void getPageInfo()
      .then((value) => {
        if (live && value) setInfo(value)
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [])

  return (
    <ToolPage tool={tool}>
      {!loaded ? (
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      ) : !info ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          {t('web.noPageInfo')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <InfoRow label="Title" value={info.title} />
          <InfoRow label="URL" value={info.url} />
          <InfoRow label="Description" value={info.metaDescription} />
          <InfoRow label="Canonical" value={info.canonical} />
          <div className="grid grid-cols-3 gap-1.5">
            <InfoRow label="Lang" value={info.language || '—'} />
            <InfoRow label="Charset" value={info.charset} />
            <InfoRow label="Viewport" value={info.viewport ? '✓' : '—'} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded border p-2 text-center">
              <Badge variant="secondary">{info.links.length}</Badge>
              <p className="text-[11px] text-muted-foreground">{t('web.links')}</p>
            </div>
            <div className="rounded border p-2 text-center">
              <Badge variant="secondary">{info.images.length}</Badge>
              <p className="text-[11px] text-muted-foreground">{t('web.images')}</p>
            </div>
          </div>
          {Object.keys(info.openGraph).length > 0 && (
            <Section title="Open Graph">
              {Object.entries(info.openGraph).map(([key, value]) => (
                <InfoRow key={key} label={key.replace('og:', '')} value={value} />
              ))}
            </Section>
          )}
          {Object.keys(info.twitter).length > 0 && (
            <Section title="Twitter / X">
              {Object.entries(info.twitter).map(([key, value]) => (
                <InfoRow key={key} label={key.replace('twitter:', '')} value={value} />
              ))}
            </Section>
          )}
        </div>
      )}
    </ToolPage>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded border bg-muted/40 p-1.5">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="break-words text-[11px]">{value ?? '—'}</p>
      </div>
      {value && <CopyButton text={value} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2">
      <p className="mb-1 text-[11px] font-medium">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
