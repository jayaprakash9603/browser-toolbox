import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { PdfDocumentHandle, PdfPageInfo } from '@/core/engines/pdf/pdfjs'
import { PdfPageImage } from '@/shared/components/pdf'
import { OptionField } from '@/shared/components/toolkit'
import { cn } from '@/shared/utils/cn'
import { THUMB_TRAY, trayFit } from './modes'

interface PageThumbProps {
  handle: PdfDocumentHandle
  /** Zero-based page index. */
  index: number
  info: PdfPageInfo
  label: string
  turn?: number
  /** Shown in the corner badge; defaults to the page number. */
  badge?: ReactNode
  className?: string
  children?: ReactNode
}

/** A page thumbnail on a soft tray with a number badge; extra controls go in `children`. */
export function PageThumb({ handle, index, info, label, turn = 0, badge, className, children }: PageThumbProps) {
  const ratio = turn % 2 ? info.height / info.width : info.width / info.height
  return (
    <div className={cn(THUMB_TRAY, className)}>
      <PdfPageImage
        doc={handle}
        pageNumber={index + 1}
        width={info.width}
        height={info.height}
        turn={turn}
        alt={label}
        className={trayFit(ratio)}
      />
      <span className="absolute top-1 left-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-xs">
        {badge ?? index + 1}
      </span>
      {children}
    </div>
  )
}

/** Preset colours plus a free colour picker. */
export function Swatches({ label, colors, value, onChange }: { label: string; colors: readonly string[]; value: string; onChange: (color: string) => void }) {
  const { t } = useTranslation()
  return (
    <OptionField label={label}>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value.toLowerCase() === color}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'size-6 cursor-pointer rounded-full border outline-none ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
              value.toLowerCase() === color && 'ring-2 ring-primary',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        <label
          className={cn(
            'relative size-6 cursor-pointer overflow-hidden rounded-full border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-offset-2 ring-offset-background transition-transform hover:scale-110 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            !colors.includes(value.toLowerCase()) && 'ring-2 ring-primary',
          )}
          title={t('pdf.customColor')}
        >
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t('pdf.customColor')} />
        </label>
      </div>
    </OptionField>
  )
}
