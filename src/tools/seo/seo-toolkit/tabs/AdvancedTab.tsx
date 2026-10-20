import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SeoReport } from '@/core/engines/seo/types'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { getPageSpeedApiKey, setPageSpeedApiKey } from '../pagespeed'
import { highlightOnPage, clearHighlightOnPage } from '../highlight'

const EXTERNAL_TOOLS = [
  { name: 'Google PageSpeed', path: 'https://pagespeed.web.dev/analysis?url=' },
  { name: 'Rich Results Test', path: 'https://search.google.com/test/rich-results?url=' },
  { name: 'Ahrefs', path: 'https://ahrefs.com/site-explorer/overview?target=' },
  { name: 'Semrush', path: 'https://www.semrush.com/analytics/overview/?q=' },
  { name: 'Moz', path: 'https://moz.com/domain-analysis?site=' },
  { name: 'Archive.org', path: 'https://web.archive.org/web/*/' },
  { name: 'Whois', path: 'https://who.is/whois/' },
] as const

export function AdvancedTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  let host = ''
  try {
    host = new URL(report.page.url).hostname
  } catch {
    host = report.page.url
  }

  useEffect(() => {
    void getPageSpeedApiKey().then(setApiKey)
  }, [])

  const saveKey = async () => {
    await setPageSpeedApiKey(apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] font-medium">{t('seo.externalTools')}</p>
        <div className="flex flex-col gap-1">
          {EXTERNAL_TOOLS.map((tool) => {
            const href =
              tool.name === 'Whois'
                ? `${tool.path}${host}`
                : tool.name === 'Archive.org'
                  ? `${tool.path}${report.page.url}`
                  : `${tool.path}${encodeURIComponent(report.page.url)}`
            return (
              <a
                key={tool.name}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                {tool.name}
              </a>
            )
          })}
          <a
            href={`https://www.google.com/search?q=site:${host}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-primary hover:underline"
          >
            Google site:{host}
          </a>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium">{t('seo.highlightTools')}</p>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => void highlightOnPage('links-nofollow')}
          >
            {t('seo.highlightNofollow')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => void clearHighlightOnPage()}
          >
            {t('seo.clearHighlight')}
          </Button>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium">{t('seo.psiApiKey')}</p>
        <div className="flex gap-1">
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('seo.psiApiKeyPlaceholder')}
            className="h-8 text-[11px]"
          />
          <Button type="button" size="sm" className="h-8 shrink-0 text-[11px]" onClick={() => void saveKey()}>
            {saved ? t('seo.keySaved') : t('seo.saveKey')}
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{t('seo.psiApiKeyHint')}</p>
      </div>
      {report.network.llmsTxt && (
        <div>
          <p className="mb-1 text-[11px] font-medium">llms.txt</p>
          <pre className="max-h-32 overflow-auto rounded border bg-muted/30 p-2 text-[10px]">
            {report.network.llmsTxt.slice(0, 4000)}
          </pre>
        </div>
      )}
    </div>
  )
}
