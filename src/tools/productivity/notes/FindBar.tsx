import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaseSensitiveIcon,
  ChevronRightIcon,
  WholeWordIcon,
  XIcon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import type { FindOptions } from './notesFormat'

export type FindMode = 'find' | 'replace' | 'goto'

interface FindBarProps {
  mode: FindMode
  onModeChange: (mode: FindMode) => void
  query: string
  onQueryChange: (query: string) => void
  options: FindOptions
  onOptionsChange: (options: FindOptions) => void
  matchCount: number
  currentIndex: number
  onNext: () => void
  onPrevious: () => void
  onReplace: (replacement: string) => void
  onReplaceAll: (replacement: string) => void
  onGoToLine: (line: number) => void
  lineCount: number
  onClose: () => void
  focusToken: number
}

export function FindBar({
  mode,
  onModeChange,
  query,
  onQueryChange,
  options,
  onOptionsChange,
  matchCount,
  currentIndex,
  onNext,
  onPrevious,
  onReplace,
  onReplaceAll,
  onGoToLine,
  lineCount,
  onClose,
  focusToken,
}: FindBarProps) {
  const { t } = useTranslation()
  const [replacement, setReplacement] = useState('')
  const [line, setLine] = useState('')
  const findRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const gotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = mode === 'goto' ? gotoRef.current : findRef.current
    el?.focus()
    el?.select()
  }, [mode, focusToken])

  const keepFocus = (fn: () => void, ref: RefObject<HTMLInputElement | null>) => {
    fn()
    requestAnimationFrame(() => ref.current?.focus())
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  if (mode === 'goto') {
    const submit = () => {
      const n = Number.parseInt(line, 10)
      if (Number.isFinite(n) && n >= 1) onGoToLine(Math.min(n, lineCount))
    }
    return (
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1" onKeyDown={onKeyDown}>
        <Input
          ref={gotoRef}
          type="number"
          min={1}
          max={lineCount}
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t('notes.goToLinePlaceholder', { count: lineCount })}
          aria-label={t('notes.goToLine')}
          className="h-7 flex-1 text-xs"
        />
        <Button size="xs" onClick={submit}>
          {t('notes.goTo')}
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={onClose} aria-label={t('notes.close')}>
          <XIcon />
        </Button>
      </div>
    )
  }

  const status = query ? (matchCount ? `${currentIndex + 1}/${matchCount}` : t('notes.noResults')) : ''

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-1" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-0.5">
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onModeChange(mode === 'replace' ? 'find' : 'replace')}
          aria-label={t('notes.toggleReplace')}
          aria-expanded={mode === 'replace'}
          title={t('notes.toggleReplace')}
        >
          <ChevronRightIcon className={cn('transition-transform', mode === 'replace' && 'rotate-90')} />
        </Button>
        <div className="relative min-w-0 flex-1">
          <Input
            ref={findRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'F3') {
                e.preventDefault()
                if (e.shiftKey) onPrevious()
                else onNext()
              }
            }}
            placeholder={t('notes.find')}
            aria-label={t('notes.find')}
            className="h-7 pr-12 text-xs"
          />
          <span
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {status}
          </span>
        </div>
        <Button
          size="icon-xs"
          variant={options.matchCase ? 'secondary' : 'ghost'}
          aria-pressed={options.matchCase}
          onClick={() => onOptionsChange({ ...options, matchCase: !options.matchCase })}
          aria-label={t('notes.matchCase')}
          title={t('notes.matchCase')}
        >
          <CaseSensitiveIcon />
        </Button>
        <Button
          size="icon-xs"
          variant={options.wholeWord ? 'secondary' : 'ghost'}
          aria-pressed={options.wholeWord}
          onClick={() => onOptionsChange({ ...options, wholeWord: !options.wholeWord })}
          aria-label={t('notes.wholeWord')}
          title={t('notes.wholeWord')}
        >
          <WholeWordIcon />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          disabled={!matchCount}
          onClick={onPrevious}
          aria-label={t('notes.previousMatch')}
          title={`${t('notes.previousMatch')} (Shift+F3)`}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          disabled={!matchCount}
          onClick={onNext}
          aria-label={t('notes.nextMatch')}
          title={`${t('notes.nextMatch')} (F3)`}
        >
          <ArrowDownIcon />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={onClose} aria-label={t('notes.close')} title="Esc">
          <XIcon />
        </Button>
      </div>
      {mode === 'replace' && (
        <div className="flex items-center gap-1 pl-7">
          <Input
            ref={replaceRef}
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                keepFocus(() => (e.ctrlKey || e.metaKey ? onReplaceAll(replacement) : onReplace(replacement)), replaceRef)
              }
            }}
            placeholder={t('notes.replaceWith')}
            aria-label={t('notes.replaceWith')}
            className="h-7 min-w-0 flex-1 text-xs"
          />
          <Button
            size="xs"
            variant="outline"
            disabled={!matchCount}
            onClick={() => keepFocus(() => onReplace(replacement), replaceRef)}
          >
            {t('notes.replace')}
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={!matchCount}
            onClick={() => keepFocus(() => onReplaceAll(replacement), replaceRef)}
          >
            {t('notes.replaceAll')}
          </Button>
        </div>
      )}
    </div>
  )
}
