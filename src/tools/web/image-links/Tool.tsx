import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { CopyButton } from '@/shared/components/CopyButton'
import { useWebTool, getPageInfo } from '../_shared'

interface PageImage {
  src: string
  alt: string | null
  width: number
  height: number
}

export default function ImageLinksTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.image-links')
  const [images, setImages] = useState<PageImage[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void getPageInfo().then((info) => { if (live && info) setImages(info.images) }).finally(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [])

  const urls = images.map((img) => img.src).filter(Boolean)
  const missingAlt = images.filter((img) => !img.alt).length

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        {!loaded ? <p className="text-xs text-muted-foreground">{t('nav.loading')}</p> : images.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center text-muted-foreground">
            <ImageIcon className="size-7" />
            <p className="text-xs">{t('web.noImages')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{images.length}</Badge>
              {missingAlt > 0 && <span className="text-amber-600 dark:text-amber-400">{t('web.missingAlt', { count: missingAlt })}</span>}
              <CopyButton text={urls.join('\n')} size="xs" label={t('web.copyUrls')} />
            </div>
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {images.map((img, index) => (
                <div key={`${img.src}-${index}`} className="rounded-md border p-1.5">
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <code className="block truncate font-mono text-[10px]">{img.src}</code>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {img.width}×{img.height} · {img.alt ? img.alt.slice(0, 60) : t('web.noAlt')}
                      </p>
                    </div>
                    <CopyButton text={img.src} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ToolPage>
  )
}
