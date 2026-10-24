import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { FileLockIcon, LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'

import { PdfPasswordError } from '@/core/engines/pdf/pdfjs'
import { Button } from '@/shared/components/ui/button'
import { PdfPageImage } from './PdfPageImage'
import { usePdfDocument } from './usePdfDocument'

interface PdfFilePreviewProps {
  blob: Blob
  password?: string
  initialPages?: number
}

/** Renders a finished PDF page by page with PDF.js, exactly as a reader would show it. */
export function PdfFilePreview({ blob, password, initialPages = 6 }: PdfFilePreviewProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const loaded = usePdfDocument(blob, password)
  const [limit, setLimit] = useState(initialPages)

  if (loaded.status === 'loading') {
    return (
      <div className="flex min-h-60 items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
        {t('fileui.pdfLoading')}
      </div>
    )
  }
  if (loaded.status === 'error') {
    const locked = loaded.error instanceof PdfPasswordError
    const Icon = locked ? FileLockIcon : TriangleAlertIcon
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
        <Icon className="size-6" aria-hidden />
        {locked ? t('fileui.pdfLocked') : t('fileui.pdfFailed')}
      </div>
    )
  }

  const { doc, pages } = loaded
  const total = pages.length
  return (
    <div className="flex flex-col items-center gap-5">
      {pages.slice(0, limit).map((page, index) => (
        <motion.figure
          key={index}
          className="flex w-full flex-col items-center gap-1.5"
          style={{ maxWidth: Math.min(page.width * 1.15, 760) }}
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: reduce ? 0 : Math.min(index, 5) * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <PdfPageImage
            doc={doc}
            pageNumber={index + 1}
            width={page.width}
            height={page.height}
            eager={index < 2}
            alt={t('fileui.page', { index: index + 1, total })}
          />
          <figcaption className="text-[11px] tabular-nums text-muted-foreground">{t('fileui.page', { index: index + 1, total })}</figcaption>
        </motion.figure>
      ))}
      {limit < total && (
        <Button variant="outline" size="xs" onClick={() => setLimit((value) => value + 10)}>
          {t('fileui.morePages', { count: Math.min(10, total - limit) })}
        </Button>
      )}
    </div>
  )
}
