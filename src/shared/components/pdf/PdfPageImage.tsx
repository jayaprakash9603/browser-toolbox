import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { FileWarningIcon } from 'lucide-react'

import type { PdfDocumentHandle } from '@/core/engines/pdf/pdfjs'
import { cn } from '@/shared/utils/cn'
import { pageImageUrl, renderBucket, RenderSkipped } from './pageImages'
import { PAGE_CARD } from './styles'

interface PdfPageImageProps {
  doc: PdfDocumentHandle
  /** One-based page number in `doc`. */
  pageNumber: number
  /** Displayed page size in points, after the page's own rotation. */
  width: number
  height: number
  /** Extra clockwise quarter turns, applied with CSS so rotating never re-renders. */
  turn?: number
  alt: string
  className?: string
  /** Render now instead of when scrolled into view. */
  eager?: boolean
}

const FALLBACK_WIDTH = 320

/** A lazily rendered PDF page that keeps its aspect ratio while loading. */
export const PdfPageImage = memo(function PdfPageImage({
  doc,
  pageNumber,
  width,
  height,
  turn = 0,
  alt,
  className,
  eager = false,
}: PdfPageImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => eager || typeof IntersectionObserver === 'undefined')
  const [cssWidth, setCssWidth] = useState(FALLBACK_WIDTH)
  const [loaded, setLoaded] = useState<{ doc: PdfDocumentHandle; page: number; url: string } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const sideways = turn % 2 !== 0

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      if (box.width > 0) setCssWidth(sideways ? box.height : box.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [sideways])

  const pixelWidth = renderBucket(cssWidth * (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))
  const key = `${pageNumber}:${pixelWidth}`
  // A sharper render replaces the current one; until then the softer image stays.
  const url = loaded?.doc === doc && loaded.page === pageNumber ? loaded.url : null

  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    pageImageUrl(doc, pageNumber, width, pixelWidth, controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) setLoaded({ doc, page: pageNumber, url: next })
      },
      (error: unknown) => {
        if (!controller.signal.aborted && !(error instanceof RenderSkipped)) setFailedKey(key)
      },
    )
    return () => controller.abort()
  }, [doc, pageNumber, width, pixelWidth, visible, key])

  const ratio = sideways ? height / width : width / height
  return (
    <div
      ref={ref}
      className={cn('relative w-full', PAGE_CARD, className)}
      style={{ aspectRatio: `${ratio}` }}
    >
      {url ? (
        <div
          className="absolute top-1/2 left-1/2 transition-transform duration-300 ease-out"
          style={{
            width: sideways ? `${(width / height) * 100}%` : '100%',
            height: sideways ? `${(height / width) * 100}%` : '100%',
            transform: `translate(-50%, -50%) rotate(${turn * 90}deg)`,
          }}
        >
          <motion.img
            src={url}
            alt={alt}
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="block size-full max-w-none select-none"
          />
        </div>
      ) : failedKey === key ? (
        <span className="absolute inset-0 flex items-center justify-center text-slate-400">
          <FileWarningIcon className="size-5" aria-label={alt} />
        </span>
      ) : (
        <span role="img" aria-label={alt} className="absolute inset-0 animate-pulse bg-gradient-to-b from-slate-100 to-slate-200/70" />
      )}
    </div>
  )
})
