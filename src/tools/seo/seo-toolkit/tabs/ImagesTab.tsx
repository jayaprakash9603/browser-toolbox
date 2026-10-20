import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { checkUrlStatuses, type UrlStatusResult } from '@/core/engines/seo'
import type { SeoReport } from '@/core/engines/seo/types'
import { Button } from '@/shared/components/ui/button'
import { Stat } from '../components'
import { highlightOnPage } from '../highlight'

export function ImagesTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const images = report.page.images
  const missingAlt = images.filter((i) => i.alt === null).length
  const emptyAlt = images.filter((i) => i.alt === '').length
  const [statusMap, setStatusMap] = useState<Map<string, UrlStatusResult>>(new Map())
  const [checking, setChecking] = useState(false)

  const checkImages = async () => {
    setChecking(true)
    const urls = images.map((i) => i.src).filter((u) => u.startsWith('http'))
    const map = await checkUrlStatuses(urls)
    setStatusMap(map)
    setChecking(false)
  }

  const broken = [...statusMap.values()].filter((s) => s.status != null && s.status >= 400).length

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Stat label={t('seo.totalImages')} value={images.length} />
        <Stat label={t('seo.missingAlt')} value={missingAlt} warn={missingAlt > 0} />
        <Stat label={t('seo.emptyAlt')} value={emptyAlt} warn={emptyAlt > 0} />
        <Stat label={t('seo.brokenImages')} value={broken} warn={broken > 0} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          disabled={checking}
          onClick={() => void checkImages()}
        >
          {checking ? t('seo.checking') : t('seo.checkImages')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => void highlightOnPage('images-missing-alt')}
        >
          {t('seo.highlightMissingAlt')}
        </Button>
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {images.slice(0, 100).map((img) => {
          const st = statusMap.get(img.src)
          const badAlt = img.alt === null
          return (
            <div
              key={img.index}
              className={`flex gap-2 rounded border p-1 ${badAlt ? 'border-amber-500/40' : ''}`}
            >
              <img src={img.src} alt="" className="size-10 shrink-0 rounded object-cover bg-muted" />
              <div className="min-w-0 flex-1 text-[10px]">
                <p className="truncate font-mono">{img.src}</p>
                <p className="text-muted-foreground">
                  {img.width}×{img.height}
                  {img.alt != null ? ` · alt: ${img.alt || '(empty)'}` : ' · no alt'}
                  {st?.status != null && ` · HTTP ${st.status}`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
