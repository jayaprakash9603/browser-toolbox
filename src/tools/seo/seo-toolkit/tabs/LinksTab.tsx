import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { checkUrlStatuses, exportLinksCsv, type UrlStatusResult } from '@/core/engines/seo'
import type { SeoReport } from '@/core/engines/seo/types'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { Stat } from '../components'
import { highlightOnPage } from '../highlight'

export function LinksTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [statusMap, setStatusMap] = useState<Map<string, UrlStatusResult>>(new Map())
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const links = report.page.links
  const stats = useMemo(() => {
    const unique = new Set(links.map((l) => l.href))
    return {
      total: links.length,
      unique: unique.size,
      internal: links.filter((l) => l.internal).length,
      external: links.filter((l) => !l.internal && !l.subdomain).length,
      nofollow: links.filter((l) => l.nofollow).length,
    }
  }, [links])

  const filtered = links.filter((l) => {
    if (!filter.trim()) return true
    const q = filter.toLowerCase()
    return l.href.toLowerCase().includes(q) || l.text.toLowerCase().includes(q)
  })

  const runStatusCheck = async () => {
    setChecking(true)
    const urls = links
      .map((l) => l.href)
      .filter((u) => u.startsWith('http'))
    const map = await checkUrlStatuses(urls, {
      onProgress: (done, total) => setProgress({ done, total }),
    })
    setStatusMap(map)
    setChecking(false)
  }

  const broken = [...statusMap.values()].filter((s) => s.status != null && s.status >= 400).length

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Stat label={t('seo.totalLinks')} value={stats.total} />
        <Stat label={t('seo.uniqueLinks')} value={stats.unique} />
        <Stat label={t('seo.internal')} value={stats.internal} />
        <Stat label={t('seo.external')} value={stats.external} />
      </div>
      <div className="flex flex-wrap gap-1">
        <CopyButton text={exportLinksCsv(report.page)} label={t('seo.copyLinks')} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          disabled={checking}
          onClick={() => void runStatusCheck()}
        >
          {checking
            ? t('seo.checkingLinks', { done: progress.done, total: progress.total })
            : t('seo.checkLinks')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => void highlightOnPage('links-nofollow')}
        >
          {t('seo.highlightNofollow')}
        </Button>
      </div>
      {broken > 0 && (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          {t('seo.brokenLinks', { count: broken })}
        </p>
      )}
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t('seo.searchLinks')}
        className="h-8 text-[11px]"
      />
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {filtered.slice(0, 200).map((link) => {
          const st = statusMap.get(link.href)
          return (
            <div key={`${link.index}-${link.href}`} className="rounded border px-1.5 py-1 text-[10px]">
              <div className="flex items-center gap-1">
                {link.nofollow && (
                  <Badge variant="outline" className="text-[9px]">nofollow</Badge>
                )}
                {st?.status != null && (
                  <Badge
                    variant="outline"
                    className={
                      st.status >= 400
                        ? 'border-red-500/50 text-[9px]'
                        : 'text-[9px]'
                    }
                  >
                    {st.status}
                  </Badge>
                )}
                <span className="truncate font-medium">{link.text || '(empty)'}</span>
              </div>
              <p className="truncate text-muted-foreground">{link.href}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
