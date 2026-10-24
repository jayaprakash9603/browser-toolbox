import { useState, type ReactNode } from 'react'
import { PauseIcon, PlayIcon, RotateCcwIcon, SkipBackIcon, SkipForwardIcon, SquareIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Slider } from '@/shared/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import type { ReaderStatus } from './useSpeechReader'
import { estimateSeconds, formatClock, wordsBefore, type Segment } from './speechText'

function IconButton({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-1.5 opacity-70">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

interface PlayerBarProps {
  status: ReaderStatus
  finished: boolean
  position: number
  segments: Segment[]
  totalWords: number
  rate: number
  disabled: boolean
  voiceRow: ReactNode
  speedControl: ReactNode
  optionsControl: ReactNode
  notice?: ReactNode
  onToggle: () => void
  onStop: () => void
  onPrevious: () => void
  onNext: () => void
  onSeek: (index: number) => void
}

export function PlayerBar({
  status,
  finished,
  position,
  segments,
  totalWords,
  rate,
  disabled,
  voiceRow,
  speedControl,
  optionsControl,
  notice,
  onToggle,
  onStop,
  onPrevious,
  onNext,
  onSeek,
}: PlayerBarProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [scrub, setScrub] = useState<number | null>(null)
  const total = segments.length
  const shown = scrub ?? position
  const spoken = wordsBefore(segments, shown)
  const elapsed = estimateSeconds(spoken, rate)
  const remaining = estimateSeconds(Math.max(totalWords - spoken, 0), rate)
  const playing = status === 'playing'
  const playLabel = playing ? t('text.readAloud.pause') : finished ? t('text.readAloud.replay') : t('text.readAloud.play')
  const iconTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 500, damping: 30 }

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t bg-background px-[var(--density-page-pad)] pt-3 pb-[var(--density-page-pad)] shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.25)]">
      {notice}
      {voiceRow}

      <div>
        <Slider
          min={0}
          max={Math.max(total - 1, 1)}
          step={1}
          value={[shown]}
          disabled={disabled || total < 2}
          onValueChange={([value]) => setScrub(value)}
          onValueCommit={([value]) => {
            setScrub(null)
            onSeek(value)
          }}
          thumbLabel={t('text.readAloud.position')}
          getValueText={(value) =>
            t('text.readAloud.positionValue', { current: Math.min(value + 1, total), total })
          }
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>
            <span className="sr-only">{t('text.readAloud.elapsed')} </span>
            {formatClock(elapsed)}
          </span>
          <span aria-hidden>{total > 0 ? `${Math.min(shown + 1, total)} / ${total}` : '–'}</span>
          <span>
            <span className="sr-only">{t('text.readAloud.remaining')} </span>-{formatClock(remaining)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start">{speedControl}</div>
        <div className="flex items-center gap-2">
          <IconButton label={t('text.readAloud.previous')} shortcut="←" disabled={disabled || position <= 0} onClick={onPrevious}>
            <SkipBackIcon aria-hidden />
          </IconButton>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                aria-label={playLabel}
                disabled={disabled}
                onClick={onToggle}
                className="size-12 rounded-full shadow-md hover:shadow-lg [&_svg]:size-5"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={playing ? 'pause' : finished ? 'replay' : 'play'}
                    className="flex"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={iconTransition}
                  >
                    {playing ? (
                      <PauseIcon aria-hidden className="fill-current" />
                    ) : finished ? (
                      <RotateCcwIcon aria-hidden />
                    ) : (
                      <PlayIcon aria-hidden className="translate-x-px fill-current" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {playLabel}
              <span className="ml-1.5 opacity-70">Space</span>
            </TooltipContent>
          </Tooltip>
          <IconButton label={t('text.readAloud.next')} shortcut="→" disabled={disabled || position >= total - 1} onClick={onNext}>
            <SkipForwardIcon aria-hidden />
          </IconButton>
        </div>
        <div className="flex items-center gap-1 justify-self-end">
          <IconButton label={t('text.readAloud.stop')} shortcut="Esc" disabled={status === 'idle'} onClick={onStop}>
            <SquareIcon aria-hidden className="fill-current" />
          </IconButton>
          {optionsControl}
        </div>
      </div>
    </div>
  )
}
