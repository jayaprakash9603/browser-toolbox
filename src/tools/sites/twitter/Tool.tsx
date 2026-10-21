import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { CopyButton } from '@/shared/components/CopyButton'
import { useSitesTool } from '../_shared'

function buildSearchQuery(opts: {
  from: string
  minFaves: string
  minRetweets: string
  media: boolean
  since: string
  until: string
  exact: string
}): string {
  const parts: string[] = []
  if (opts.from.trim()) parts.push(`from:${opts.from.trim().replace(/^@/, '')}`)
  if (opts.exact.trim()) parts.push(`"${opts.exact.trim()}"`)
  if (opts.minFaves.trim()) parts.push(`min_faves:${opts.minFaves.trim()}`)
  if (opts.minRetweets.trim()) parts.push(`min_retweets:${opts.minRetweets.trim()}`)
  if (opts.media) parts.push('filter:media')
  if (opts.since.trim()) parts.push(`since:${opts.since.trim()}`)
  if (opts.until.trim()) parts.push(`until:${opts.until.trim()}`)
  return parts.join(' ')
}

export default function TwitterPowerTools() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.twitter')
  const [from, setFrom] = useState('')
  const [minFaves, setMinFaves] = useState('')
  const [minRetweets, setMinRetweets] = useState('')
  const [media, setMedia] = useState(false)
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')
  const [exact, setExact] = useState('')
  const [draft, setDraft] = useState('')

  const query = useMemo(
    () =>
      buildSearchQuery({ from, minFaves, minRetweets, media, since, until, exact }),
    [from, minFaves, minRetweets, media, since, until, exact],
  )
  const searchUrl = query ? `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query` : ''
  const chars = draft.length
  const threadEstimate = Math.max(1, Math.ceil(chars / 280))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{t('sites.twitter.search.title')}</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">{t('sites.twitter.search.subtitle')}</p>
          <div className="grid gap-2">
            <Input placeholder={t('sites.twitter.search.from')} value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input placeholder={t('sites.twitter.search.exact')} value={exact} onChange={(e) => setExact(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t('sites.twitter.search.minFaves')} value={minFaves} onChange={(e) => setMinFaves(e.target.value)} />
              <Input placeholder={t('sites.twitter.search.minRetweets')} value={minRetweets} onChange={(e) => setMinRetweets(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t('sites.twitter.search.since')} value={since} onChange={(e) => setSince(e.target.value)} />
              <Input placeholder={t('sites.twitter.search.until')} value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={media} onChange={(e) => setMedia(e.target.checked)} />
              {t('sites.twitter.search.media')}
            </label>
          </div>
          <Textarea readOnly className="mt-3 text-xs font-mono" rows={2} value={query} />
          <div className="mt-2 flex gap-2">
            <CopyButton text={query} label={t('common.copy')} />
            {searchUrl && (
              <a className="text-xs text-primary underline" href={searchUrl} target="_blank" rel="noreferrer">
                {t('sites.twitter.search.open')}
              </a>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{t('sites.twitter.compose.title')}</h2>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="mt-2 text-xs" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('sites.twitter.compose.stats', { chars, threads: threadEstimate })}
          </p>
        </section>
      </div>
    </ToolPage>
  )
}
