import { useTranslation } from 'react-i18next'

import { keywordDensity, textToCodeRatio } from '@/core/engines/seo'
import type { SeoReport } from '@/core/engines/seo/types'
import { Stat } from '../components'

export function ContentTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const { page } = report
  const ratio = textToCodeRatio(page.charCount, page.htmlBytes)
  const kw1 = keywordDensity(page.bodyText, 1, 8)
  const kw2 = keywordDensity(page.bodyText, 2, 5)
  const kw3 = keywordDensity(page.bodyText, 3, 5)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Stat label={t('seo.words')} value={page.wordCount} warn={page.wordCount < 300} />
        <Stat label={t('seo.characters')} value={page.charCount} />
        <Stat label={t('seo.textRatio')} value={`${ratio}%`} warn={ratio < 10} />
        <Stat label={t('seo.htmlSize')} value={`${Math.round(page.htmlBytes / 1024)} KB`} />
      </div>
      <KeywordBlock title={t('seo.keywords1')} items={kw1} />
      <KeywordBlock title={t('seo.keywords2')} items={kw2} />
      <KeywordBlock title={t('seo.keywords3')} items={kw3} />
    </div>
  )
}

function KeywordBlock({
  title,
  items,
}: {
  title: string
  items: { phrase: string; count: number; density: number }[]
}) {
  if (items.length === 0) return null
  return (
    <div className="rounded border p-2">
      <p className="mb-1 text-[11px] font-medium">{title}</p>
      <div className="space-y-0.5">
        {items.map((k) => (
          <div key={k.phrase} className="flex justify-between font-mono text-[10px]">
            <span className="truncate">{k.phrase}</span>
            <span className="tabular-nums text-muted-foreground">
              {k.count} ({k.density}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
