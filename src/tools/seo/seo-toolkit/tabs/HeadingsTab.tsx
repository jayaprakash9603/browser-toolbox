import { useTranslation } from 'react-i18next'

import { exportHeadingsOutline } from '@/core/engines/seo'
import type { SeoReport } from '@/core/engines/seo/types'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { CheckRow } from '../components'
import { highlightOnPage } from '../highlight'

export function HeadingsTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const issues = report.checks.filter((c) => c.category === 'headings' && !c.ok && c.weight > 0)
  const outline = exportHeadingsOutline(report.page)

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <CopyButton text={outline} label={t('seo.copyOutline')} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => void highlightOnPage('headings')}
        >
          {t('seo.highlight')}
        </Button>
      </div>
      {issues.map((c) => (
        <CheckRow key={c.id} check={c} />
      ))}
      <div className="space-y-0.5">
        {report.page.headings.map((h) => (
          <div
            key={h.index}
            className="flex items-center gap-1.5 font-mono text-[11px]"
            style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
          >
            <Badge variant="outline" className="text-[11px]">
              h{h.level}
            </Badge>
            <span className="truncate">{h.text || '(empty)'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
