import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { CheckIcon, XIcon } from 'lucide-react'

import { parsePageSelection } from '@/core/engines/pdf/ranges'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'
import { PageThumb } from './common'
import { THUMB_GRID } from './modes'
import type { OpenPdf } from './session'

interface PagePickerProps {
  doc: OpenPdf
  selected: ReadonlySet<number>
  onChange: (selected: Set<number>) => void
  /** `remove` marks chosen pages for deletion; `keep` marks them to keep. */
  tone: 'remove' | 'keep'
}

/** Thumbnails to click (shift-click for a run), with quick picks and a range box. */
export function PagePicker({ doc, selected, onChange, tone }: PagePickerProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const total = doc.pages.length
  const anchor = useRef<number | null>(null)
  const [range, setRange] = useState('')
  const [rangeError, setRangeError] = useState(false)

  const toggle = (index: number, extend: boolean) => {
    const next = new Set(selected)
    if (extend && anchor.current !== null) {
      const [from, to] = [Math.min(anchor.current, index), Math.max(anchor.current, index)]
      const on = !selected.has(index)
      for (let page = from; page <= to; page += 1) {
        if (on) next.add(page)
        else next.delete(page)
      }
    } else if (next.has(index)) next.delete(index)
    else next.add(index)
    anchor.current = index
    onChange(next)
  }

  const quick = (pick: (index: number) => boolean) => onChange(new Set(Array.from({ length: total }, (_, index) => index).filter(pick)))

  const applyRange = () => {
    const parsed = parsePageSelection(range, total)
    if (!parsed.ok) {
      setRangeError(true)
      return
    }
    setRangeError(false)
    onChange(new Set(parsed.groups.flat()))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="xs" onClick={() => quick(() => true)}>
          {t('pdf.pick.all')}
        </Button>
        <Button variant="outline" size="xs" onClick={() => quick(() => false)} disabled={!selected.size}>
          {t('pdf.pick.none')}
        </Button>
        <Button variant="outline" size="xs" onClick={() => quick((index) => !selected.has(index))}>
          {t('pdf.pick.invert')}
        </Button>
        <Button variant="outline" size="xs" onClick={() => quick((index) => index % 2 === 0)}>
          {t('pdf.pick.odd')}
        </Button>
        <Button variant="outline" size="xs" onClick={() => quick((index) => index % 2 === 1)}>
          {t('pdf.pick.even')}
        </Button>
        <form
          className="ml-auto flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            applyRange()
          }}
        >
          <Input
            value={range}
            onChange={(event) => {
              setRange(event.target.value)
              setRangeError(false)
            }}
            placeholder={t('pdf.pick.rangePlaceholder')}
            aria-label={t('pdf.pick.range')}
            aria-invalid={rangeError || undefined}
            className="h-7 w-36 font-mono text-xs"
          />
          <Button type="submit" variant="secondary" size="xs" disabled={!range.trim()}>
            {t('pdf.pick.apply')}
          </Button>
        </form>
      </div>
      <ol className={THUMB_GRID} aria-label={t('pdf.view.thumbnails')}>
        {doc.pages.map((info, index) => {
          const on = selected.has(index)
          const removing = tone === 'remove' && on
          return (
            <li key={index}>
              <button
                type="button"
                aria-pressed={on}
                onClick={(event) => toggle(index, event.shiftKey)}
                className={cn(
                  'group relative block w-full cursor-pointer rounded-xl border bg-card p-1.5 text-left outline-none transition-[border-color,box-shadow,opacity] duration-200 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring',
                  on && tone === 'keep' && 'border-transparent ring-2 ring-primary',
                  removing && 'border-transparent ring-2 ring-destructive',
                  tone === 'keep' && selected.size > 0 && !on && 'opacity-55',
                )}
              >
                <PageThumb handle={doc.handle} index={index} info={info} label={t('fileui.page', { index: index + 1, total })} className={cn(removing && 'opacity-45 grayscale')}>
                  {on && (
                    <motion.span
                      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        'absolute top-1 right-1 flex size-6 items-center justify-center rounded-full text-white shadow-md',
                        removing ? 'bg-destructive' : 'bg-primary',
                      )}
                      aria-hidden
                    >
                      {removing ? <XIcon className="size-3.5" /> : <CheckIcon className="size-3.5" strokeWidth={3} />}
                    </motion.span>
                  )}
                </PageThumb>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
