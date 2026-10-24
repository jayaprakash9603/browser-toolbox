import { memo, useEffect, useRef, type MouseEvent } from 'react'
import { CodeIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/utils/cn'

import type { ReaderTextSize } from './prefs'
import type { ReaderBlock, ReaderModel, WordRange } from './speechText'

const TEXT_SIZES: Record<ReaderTextSize, { body: string; heading: string }> = {
  sm: { body: 'text-[13px] leading-6', heading: 'text-sm' },
  md: { body: 'text-[15px] leading-7', heading: 'text-base' },
  lg: { body: 'text-[17px] leading-8', heading: 'text-lg' },
}

/** Keeps the current sentence comfortably inside the scroll viewport. */
const FOLLOW_MARGIN_PX = 56

type BlockPosition = 'before' | 'current' | 'after'

interface BlockProps {
  block: ReaderBlock
  headingSize: string
  placement: BlockPosition
  /** Only meaningful for the block that holds the current sentence. */
  position: number
  marking: boolean
  dimRead: boolean
  word: WordRange | null
}

function SentenceText({ text, word }: { text: string; word: WordRange | null }) {
  if (!word) return text
  return (
    <>
      {text.slice(0, word.start)}
      <mark className="rounded-[3px] bg-primary px-px text-primary-foreground">{text.slice(word.start, word.end)}</mark>
      {text.slice(word.end)}
    </>
  )
}

const Block = memo(function Block({ block, headingSize, placement, position, marking, dimRead, word }: BlockProps) {
  const { t } = useTranslation()

  if (block.skipped) {
    return (
      <figure className="rounded-md border border-dashed bg-muted/40 px-3 py-2">
        <figcaption className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <CodeIcon className="size-3.5" aria-hidden />
          {t('text.readAloud.skippedCode')}
        </figcaption>
        <pre className="line-clamp-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground/80">{block.text}</pre>
      </figure>
    )
  }

  const sentences = block.segments.map((segment) => {
    const active = marking && placement === 'current' && segment.index === position
    const read = dimRead && (placement === 'before' || (placement === 'current' && segment.index < position))
    return (
      <span key={segment.index}>
        <button
          type="button"
          data-segment={segment.index}
          aria-current={active ? 'true' : undefined}
          tabIndex={active || (!marking && segment.index === 0) ? 0 : -1}
          className={cn(
            'inline cursor-pointer rounded-[4px] text-left [box-decoration-break:clone] transition-[background-color,color,box-shadow] duration-200 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            active && 'bg-primary/15 text-foreground ring-2 ring-primary/20 hover:bg-primary/20',
            read && 'text-muted-foreground',
          )}
        >
          <SentenceText text={segment.text} word={active ? word : null} />
        </button>{' '}
      </span>
    )
  })

  switch (block.type) {
    case 'heading':
      return <h2 className={cn('font-semibold tracking-tight text-foreground', headingSize)}>{sentences}</h2>
    case 'list':
      return (
        <p className="relative pl-4 before:absolute before:top-[0.75em] before:left-1 before:size-1.5 before:rounded-full before:bg-primary/50">
          {sentences}
        </p>
      )
    case 'quote':
      return <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground italic">{sentences}</blockquote>
    case 'code':
      return <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs">{sentences}</p>
    default:
      return <p>{sentences}</p>
  }
})

interface ReaderViewProps {
  model: ReaderModel
  position: number
  /** Whether a reading position exists (playing, paused or a chosen start point). */
  marking: boolean
  playing: boolean
  word: WordRange | null
  highlightWords: boolean
  follow: boolean
  textSize: ReaderTextSize
  onSelect: (index: number) => void
}

export function ReaderView({
  model,
  position,
  marking,
  playing,
  word,
  highlightWords,
  follow,
  textSize,
  onSelect,
}: ReaderViewProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const size = TEXT_SIZES[textSize]
  const currentBlock = model.segments[position]?.block ?? -1

  useEffect(() => {
    if (!follow || !marking) return
    const target = contentRef.current?.querySelector<HTMLElement>(`[data-segment="${position}"]`)
    const viewport = target?.closest<HTMLElement>('[data-radix-scroll-area-viewport]')
    if (!target || !viewport || typeof viewport.scrollTo !== 'function') return
    const box = target.getBoundingClientRect()
    const view = viewport.getBoundingClientRect()
    if (box.top >= view.top + FOLLOW_MARGIN_PX && box.bottom <= view.bottom - FOLLOW_MARGIN_PX) return
    viewport.scrollTo({
      top: viewport.scrollTop + box.top - view.top - view.height / 3,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [position, follow, marking, reduceMotion])

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-segment]')
    if (target) onSelect(Number(target.dataset.segment))
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div
        ref={contentRef}
        onClick={handleClick}
        className={cn('flex flex-col gap-3 px-[var(--density-page-pad)] py-4 text-foreground/90', size.body)}
      >
        {!marking && model.segments.length > 1 && (
          <p className="text-xs text-muted-foreground">{t('text.readAloud.jumpHint')}</p>
        )}
        {model.blocks.map((block, index) => {
          const placement: BlockPosition =
            index === currentBlock ? 'current' : currentBlock !== -1 && index < currentBlock ? 'before' : 'after'
          return (
            <Block
              key={index}
              block={block}
              headingSize={size.heading}
              placement={marking ? placement : 'after'}
              position={placement === 'current' ? position : -1}
              marking={marking}
              dimRead={marking}
              word={placement === 'current' && playing && highlightWords ? word : null}
            />
          )
        })}
      </div>
    </ScrollArea>
  )
}
