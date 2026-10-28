import { useId, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AppWindowIcon, CameraIcon, EraserIcon, ListChecksIcon } from 'lucide-react'

import { appendUrls, MAX_BATCH_URLS, parseUrlList, type ParsedUrlList } from '@/core/screenshot/urlList'
import { PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

const CHIP_TONES = {
  ready: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  muted: 'border-border bg-muted text-muted-foreground',
} as const

function summaryChips(parsed: ParsedUrlList, t: TFunction) {
  const chips: { key: string; tone: keyof typeof CHIP_TONES; text: string }[] = []
  if (parsed.urls.length) chips.push({ key: 'ready', tone: 'ready', text: t('capture.urls.ready', { count: parsed.urls.length }) })
  if (parsed.invalid.length) {
    chips.push({
      key: 'invalid',
      tone: 'error',
      text: t('capture.urls.invalid', { count: parsed.invalid.length, example: parsed.invalid[0] }),
    })
  }
  if (parsed.blocked.length) {
    chips.push({ key: 'blocked', tone: 'warn', text: t('capture.urls.blocked', { count: parsed.blocked.length }) })
  }
  if (parsed.duplicates) chips.push({ key: 'dupes', tone: 'muted', text: t('capture.urls.duplicates', { count: parsed.duplicates }) })
  if (parsed.overflow) {
    chips.push({ key: 'overflow', tone: 'warn', text: t('capture.urls.overflow', { count: parsed.overflow, max: MAX_BATCH_URLS }) })
  }
  return chips
}

/** Captures each pasted address as an entire page, in a window of its own. */
export function UrlBatch({
  windowUrls,
  waitMs,
  busy,
  onCapture,
}: {
  windowUrls: string[]
  waitMs: number
  busy: boolean
  onCapture: (urls: string[]) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const id = useId()
  const [text, setText] = useState('')
  const parsed = useMemo(() => parseUrlList(text), [text])
  const count = parsed.urls.length
  const chips = text.trim() ? summaryChips(parsed, t) : []
  const canRun = count > 0 && !busy

  const submit = () => {
    if (canRun) onCapture(parsed.urls)
  }

  return (
    <PanelSection
      title={<label htmlFor={id}>{t('capture.launcher.urlBatch')}</label>}
      icon={<ListChecksIcon />}
      actions={
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {t('capture.urls.limit', { max: MAX_BATCH_URLS })}
        </span>
      }
    >
      <Textarea
        id={id}
        aria-describedby={`${id}-help ${id}-summary`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            submit()
          }
        }}
        placeholder={t('capture.launcher.urlBatchPlaceholder')}
        rows={4}
        spellCheck={false}
        className="min-h-24 resize-y font-mono text-xs"
      />
      <p id={`${id}-help`} className="-mt-1 text-[11px] leading-4 text-muted-foreground">
        {t('capture.urls.help', { seconds: Math.round(waitMs / 100) / 10 })}
      </p>
      <div id={`${id}-summary`} role="status" aria-atomic="true" className="flex min-h-0 flex-wrap gap-1.5 empty:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((chip) => (
            <motion.span
              key={chip.key}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={cn('inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', CHIP_TONES[chip.tone])}
            >
              <span className="truncate">{chip.text}</span>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={windowUrls.length === 0}
          onClick={() => setText((current) => appendUrls(current, windowUrls))}
        >
          <AppWindowIcon />
          {t('capture.urls.addTabs', { count: windowUrls.length })}
        </Button>
        <Button variant="ghost" size="sm" disabled={!text} onClick={() => setText('')}>
          <EraserIcon />
          {t('capture.urls.clear')}
        </Button>
        <Button size="sm" className="ml-auto" disabled={!canRun} aria-keyshortcuts="Control+Enter" onClick={submit}>
          <CameraIcon />
          {count > 0 ? t('capture.urls.run', { count }) : t('capture.launcher.urlBatchRun')}
        </Button>
      </div>
    </PanelSection>
  )
}
