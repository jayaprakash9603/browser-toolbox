import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatCaptionForInstagram, toUnicodeBold, toUnicodeItalic } from '@/core/sites/instagram'
import { ToolPage } from '@/shared/components/ToolPage'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { useSitesTool } from '../_shared'

const MOBILE_CUTOFF = 140
const DESKTOP_CUTOFF = 210

export default function LinkedInCreatorTool() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.linkedin')
  const [post, setPost] = useState('')
  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')

  const mobilePreview = post.slice(0, MOBILE_CUTOFF)
  const desktopPreview = post.slice(0, DESKTOP_CUTOFF)
  const profileCsv = useMemo(() => {
    const row = [name, headline].map((v) => `"${v.replace(/"/g, '""')}"`)
    return `name,headline\n${row.join(',')}`
  }, [name, headline])

  const styled = (mode: 'bold' | 'italic' | 'spacing') => {
    if (mode === 'bold') setPost(toUnicodeBold(post))
    if (mode === 'italic') setPost(toUnicodeItalic(post))
    if (mode === 'spacing') setPost(formatCaptionForInstagram(post))
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{t('sites.linkedin.post.title')}</h2>
          <Textarea value={post} onChange={(e) => setPost(e.target.value)} rows={8} className="mt-2 text-xs" />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => styled('spacing')}>
              {t('sites.linkedin.post.spacing')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => styled('bold')}>
              {t('sites.linkedin.post.bold')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => styled('italic')}>
              {t('sites.linkedin.post.italic')}
            </Button>
          </div>
          <div className="mt-3 grid gap-2 text-xs">
            <div className="rounded-md border p-2">
              <p className="font-medium">{t('sites.linkedin.post.mobile')}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{mobilePreview}{post.length > MOBILE_CUTOFF ? '…' : ''}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="font-medium">{t('sites.linkedin.post.desktop')}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{desktopPreview}{post.length > DESKTOP_CUTOFF ? '…' : ''}</p>
            </div>
          </div>
          <div className="mt-2">
            <CopyButton text={post} label={t('common.copy')} />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{t('sites.linkedin.profile.title')}</h2>
          <input
            className="mt-2 w-full rounded-md border px-2 py-1.5 text-xs"
            placeholder={t('sites.linkedin.profile.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="mt-2 w-full rounded-md border px-2 py-1.5 text-xs"
            placeholder={t('sites.linkedin.profile.headline')}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <div className="mt-2">
            <CopyButton text={profileCsv} label={t('sites.linkedin.profile.exportCsv')} />
          </div>
        </section>
      </div>
    </ToolPage>
  )
}
