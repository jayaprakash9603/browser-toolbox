import { useTranslation } from 'react-i18next'

import { exportSchemaJson } from '@/core/engines/seo'
import type { SeoReport } from '@/core/engines/seo/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { CheckRow } from '../components'
import { highlightOnPage } from '../highlight'

export function SchemaTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const structured = report.checks.filter((c) => c.category === 'structured' || c.category === 'hreflang')

  return (
    <Tabs defaultValue="schema">
      <TabsList className="w-full">
        <TabsTrigger value="schema" className="flex-1 text-[11px]">{t('seo.schema')}</TabsTrigger>
        <TabsTrigger value="hreflang" className="flex-1 text-[11px]">{t('seo.hreflang')}</TabsTrigger>
      </TabsList>
      <TabsContent value="schema" className="mt-2 space-y-2">
        <div className="flex gap-1">
          <CopyButton text={exportSchemaJson(report.page)} label={t('seo.copySchema')} />
          <a
            className="text-[11px] text-primary hover:underline"
            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(report.page.url)}`}
            target="_blank"
            rel="noreferrer"
          >
            {t('seo.richResultsTest')}
          </a>
        </div>
        {structured
          .filter((c) => c.category === 'structured')
          .map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        {report.page.jsonLd.map((block, i) => (
          <pre
            key={i}
            className="max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[10px]"
          >
            {block.parsed ? JSON.stringify(block.parsed, null, 2) : block.raw}
          </pre>
        ))}
      </TabsContent>
      <TabsContent value="hreflang" className="mt-2 space-y-2">
        <button
          type="button"
          className="text-[11px] text-primary hover:underline"
          onClick={() => void highlightOnPage('hreflang')}
        >
          {t('seo.highlight')}
        </button>
        {structured
          .filter((c) => c.category === 'hreflang')
          .map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        <div className="space-y-0.5">
          {report.page.hreflangs.map((h, i) => (
            <div key={i} className="rounded border px-2 py-1 text-[10px]">
              <span className="font-medium">{h.hreflang}</span>
              <p className="truncate text-muted-foreground">{h.href}</p>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
