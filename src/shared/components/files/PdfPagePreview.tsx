import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'

import type { PdfFont, PdfLayout, PdfPage, Rgb } from '@/core/engines/files/pdfLayout'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

const FONT_FAMILIES: Record<PdfFont, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
}

const rgb = (color: Rgb) => `rgb(${color[0]} ${color[1]} ${color[2]})`

/** Draws one page of a PDF display list; text wraps exactly as in the exported file. */
export const PdfPageSvg = memo(function PdfPageSvg({ page, label }: { page: PdfPage; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${page.width} ${page.height}`}
      role="img"
      aria-label={label}
      className="block h-auto w-full select-none"
    >
      <rect width={page.width} height={page.height} fill="#fff" />
      {page.items.map((item, index) => {
        switch (item.kind) {
          case 'text':
            return (
              <text
                key={index}
                x={item.x}
                y={item.y}
                fontFamily={FONT_FAMILIES[item.font]}
                fontSize={item.size}
                fontWeight={item.style.startsWith('bold') ? 700 : 400}
                fontStyle={item.style.endsWith('italic') ? 'italic' : 'normal'}
                fill={rgb(item.color)}
                textLength={item.width > 0 && item.text.trim().length > 1 ? item.width : undefined}
                lengthAdjust="spacingAndGlyphs"
                style={{ whiteSpace: 'pre' }}
              >
                {item.text}
              </text>
            )
          case 'rect':
            return (
              <rect
                key={index}
                x={item.x}
                y={item.y}
                width={item.w}
                height={item.h}
                rx={item.radius}
                fill={item.fill ? rgb(item.fill) : 'none'}
                stroke={item.stroke ? rgb(item.stroke) : undefined}
                strokeWidth={item.stroke ? 0.6 : undefined}
              />
            )
          case 'line':
            return (
              <line
                key={index}
                x1={item.x1}
                y1={item.y1}
                x2={item.x2}
                y2={item.y2}
                stroke={rgb(item.color)}
                strokeWidth={item.width}
              />
            )
          case 'image':
            return (
              <image
                key={index}
                href={item.src}
                x={item.x}
                y={item.y}
                width={item.w}
                height={item.h}
                preserveAspectRatio="none"
              />
            )
        }
      })}
    </svg>
  )
})

interface PdfPagesPreviewProps {
  layout: PdfLayout
  /** Pages rendered before "show more"; large documents stay responsive. */
  initialPages?: number
  className?: string
  compact?: boolean
}

export function PdfPagesPreview({ layout, initialPages = 6, className, compact = false }: PdfPagesPreviewProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [limit, setLimit] = useState(initialPages)
  const total = layout.pages.length
  const shown = layout.pages.slice(0, limit)

  return (
    <div className={cn('flex flex-col items-center gap-5', compact && 'gap-3', className)}>
      {shown.map((page, index) => (
        <motion.figure
          key={index}
          className="flex w-full flex-col items-center gap-1.5"
          style={{ maxWidth: compact ? undefined : Math.min(page.width * 1.15, 760) }}
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: reduce ? 0 : Math.min(index, 5) * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="w-full overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgb(15_23_42/0.12),0_12px_32px_-12px_rgb(15_23_42/0.35)] ring-1 ring-black/5">
            <PdfPageSvg page={page} label={t('fileui.page', { index: index + 1, total })} />
          </div>
          <figcaption className="text-[11px] tabular-nums text-muted-foreground">
            {t('fileui.page', { index: index + 1, total })}
          </figcaption>
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
