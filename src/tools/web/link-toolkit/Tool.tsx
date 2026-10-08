import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { useWebTool, getPageInfo } from '../_shared'

type LinkFilter = 'all' | 'internal' | 'external'

export default function LinkToolkitTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.link-toolkit')
  const [links, setLinks] = useState<{ href: string; text: string; internal: boolean }[]>([])
  const [filter, setFilter] = useState<LinkFilter>('all')
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    const info = await getPageInfo()
    if (info) setLinks(info.links)
    setLoaded(true)
  }

  useEffect(() => {
    let live = true
    void getPageInfo()
      .then((info) => {
        if (live && info) setLinks(info.links)
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [])

  const filtered = useMemo(
    () =>
      links.filter(
        (link) => filter === 'all' || (filter === 'internal' ? link.internal : !link.internal),
      ),
    [links, filter],
  )
  const uniqueUrls = useMemo(() => [...new Set(filtered.map((l) => l.href))], [filtered])
  const dupes = useMemo(() => {
    const seen = new Set<string>()
    const dup = new Set<string>()
    for (const link of filtered) {
      if (seen.has(link.href)) dup.add(link.href)
      else seen.add(link.href)
    }
    return dup.size
  }, [filtered])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          {(['all', 'internal', 'external'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'secondary' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {t(`web.filter.${f}`)}
            </Button>
          ))}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void load()}
            aria-label={t('common.tryAgain')}
          >
            <RefreshCwIcon />
          </Button>
        </div>
        {!loaded ? (
          <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
        ) : links.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
            {t('web.noLinks')}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{filtered.length}</Badge>
              <span>{t('web.unique', { count: uniqueUrls.length })}</span>
              {dupes > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {t('web.dupes', { count: dupes })}
                </span>
              )}
              <CopyButton text={uniqueUrls.join('\n')} size="xs" label={t('web.copyUrls')} />
            </div>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {filtered.map((link, index) => (
                <div
                  key={`${link.href}-${index}`}
                  className="flex items-center gap-1.5 rounded border p-1.5"
                >
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[11px] ${link.internal ? '' : 'border-amber-500/40 text-amber-600 dark:text-amber-400'}`}
                  >
                    {link.internal ? 'in' : 'ext'}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px]">{link.text || t('web.noText')}</p>
                    <code className="block truncate font-mono text-[11px] text-muted-foreground">
                      {link.href}
                    </code>
                  </div>
                  <CopyButton text={link.href} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ToolPage>
  )
}
