import { useTranslation } from 'react-i18next'

import type { SeoReport } from '@/core/engines/seo/types'
import { MetaRow, Pill, Stat } from '../components'

export function OverviewTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const { page, network } = report
  const noindex =
    (page.metaRobots ?? '').toLowerCase().includes('noindex') ||
    (network.xRobotsTag ?? '').toLowerCase().includes('noindex')
  const h1 = page.headings.filter((h) => h.level === 1).length

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Pill variant={noindex ? 'bad' : 'ok'}>
          {noindex ? t('seo.notIndexable') : t('seo.indexable')}
        </Pill>
        {page.canonical && (page.canonical === page.url || page.canonical === network.finalUrl) && (
          <Pill variant="ok">{t('seo.selfCanonical')}</Pill>
        )}
        {network.statusCode != null && (
          <Pill variant={network.statusCode < 400 ? 'ok' : 'bad'}>HTTP {network.statusCode}</Pill>
        )}
      </div>
      <MetaRow label={t('seo.fieldTitle')} value={page.title} maxLen={60} />
      <MetaRow label={t('seo.fieldDescription')} value={page.metaDescription} maxLen={160} />
      <MetaRow label={t('seo.fieldUrl')} value={page.url} />
      <MetaRow label={t('seo.fieldCanonical')} value={page.canonical} />
      {page.metaRobots && <MetaRow label="robots" value={page.metaRobots} />}
      {network.xRobotsTag && <MetaRow label="X-Robots-Tag" value={network.xRobotsTag} />}
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="H1" value={h1} warn={h1 !== 1} />
        <Stat label={t('seo.tabImages')} value={page.images.length} />
        <Stat label={t('seo.tabLinks')} value={page.links.length} />
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <a
          className="text-primary hover:underline"
          href={`${new URL(page.url).origin}/robots.txt`}
          target="_blank"
          rel="noreferrer"
        >
          robots.txt
        </a>
        <a
          className="text-primary hover:underline"
          href={`${new URL(page.url).origin}/sitemap.xml`}
          target="_blank"
          rel="noreferrer"
        >
          sitemap.xml
        </a>
        {network.llmsTxt && (
          <a
            className="text-primary hover:underline"
            href={`${new URL(page.url).origin}/llms.txt`}
            target="_blank"
            rel="noreferrer"
          >
            llms.txt
          </a>
        )}
      </div>
    </div>
  )
}
