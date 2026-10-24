import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { CheckIcon, LoaderCircleIcon, MinusIcon, PlusIcon, ScissorsIcon, Settings2Icon } from 'lucide-react'

import { splitPdf } from '@/core/engines/pdf/edit'
import { describePages, parsePageRanges, splitEvery, type PageRangeIssue } from '@/core/engines/pdf/ranges'
import { ActionBar, OptionField, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { PageThumb } from './common'
import { THUMB_GRID } from './modes'
import { rangeIssueMessage } from './rangeText'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type SplitMode = 'ranges' | 'every' | 'each' | 'pick'

const GROUP_TONES = [
  { ring: 'ring-sky-500', chip: 'bg-sky-500' },
  { ring: 'ring-violet-500', chip: 'bg-violet-500' },
  { ring: 'ring-emerald-500', chip: 'bg-emerald-500' },
  { ring: 'ring-amber-500', chip: 'bg-amber-500' },
  { ring: 'ring-rose-500', chip: 'bg-rose-500' },
  { ring: 'ring-cyan-500', chip: 'bg-cyan-500' },
  { ring: 'ring-fuchsia-500', chip: 'bg-fuchsia-500' },
  { ring: 'ring-lime-500', chip: 'bg-lime-600' },
] as const

export function SplitPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [mode, setMode] = useState<SplitMode>(total > 1 ? 'ranges' : 'each')
  const [ranges, setRanges] = useState(() => (total > 1 ? `1-${Math.ceil(total / 2)}, ${Math.ceil(total / 2) + 1}-${total}` : '1'))
  const [every, setEvery] = useState(Math.max(1, Math.min(2, total - 1)))
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const { busy, error, run } = useTask()

  let groups: number[][] = []
  let issue: PageRangeIssue | null = null
  if (mode === 'ranges') {
    const result = parsePageRanges(ranges, total)
    if (result.ok) groups = result.groups
    else issue = result.issue
  } else if (mode === 'every') groups = splitEvery(total, every)
  else if (mode === 'each') groups = doc.pages.map((_, index) => [index])
  else if (picked.size) groups = [[...picked].sort((a, b) => a - b)]

  const groupOf = new Map<number, number>()
  groups.forEach((group, groupIndex) => group.forEach((page) => groupOf.has(page) || groupOf.set(page, groupIndex)))

  const togglePick = (page: number) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(page)) next.delete(page)
      else next.add(page)
      return next
    })

  const split = () =>
    run(async () => {
      if (!groups.length) return
      const outputs = await splitPdf(sourceOf(doc), groups)
      const stem = stemOf(doc)
      const artifacts = outputs.map((bytes, index) => {
        const label = describePages(groups[index]).replace(/\s/g, '').replace(/,/g, '_')
        const name = mode === 'each' ? `${stem}-page-${groups[index][0] + 1}.pdf` : `${stem}-p${label}.pdf`
        return pdfArtifact(name, bytes, { note: t('pdf.split.note', { pages: describePages(groups[index]) }) })
      })
      showResults({ artifacts, zipName: `${stem}-split.zip` })
    })

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.split.howTitle')} icon={<Settings2Icon />}>
        <Segmented
          ariaLabel={t('pdf.split.howTitle')}
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'ranges', label: t('pdf.split.ranges') },
            { value: 'every', label: t('pdf.split.every') },
            { value: 'each', label: t('pdf.split.each') },
            { value: 'pick', label: t('pdf.split.pick') },
          ]}
          className="w-full [&>button]:flex-1"
        />
        <motion.div key={mode} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {mode === 'ranges' && (
            <OptionField label={t('pdf.split.rangesLabel')}>
              <Input value={ranges} onChange={(event) => setRanges(event.target.value)} aria-invalid={issue ? true : undefined} className="h-8 font-mono text-xs" />
              <span className={cn('text-[11px]', issue ? 'text-destructive' : 'text-muted-foreground')}>
                {issue ? rangeIssueMessage(t, issue) : t('pdf.split.rangesHint')}
              </span>
            </OptionField>
          )}
          {mode === 'every' && (
            <OptionField label={t('pdf.split.everyLabel')}>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon-sm" onClick={() => setEvery((value) => Math.max(1, value - 1))} disabled={every <= 1} aria-label={t('pdf.split.fewer')}>
                  <MinusIcon />
                </Button>
                <Input
                  value={every}
                  inputMode="numeric"
                  onChange={(event) => setEvery(Math.max(1, Math.min(total, Number(event.target.value.replace(/\D/g, '')) || 1)))}
                  aria-label={t('pdf.split.everyLabel')}
                  className="h-8 w-16 text-center tabular-nums"
                />
                <Button variant="outline" size="icon-sm" onClick={() => setEvery((value) => Math.min(total, value + 1))} disabled={every >= total} aria-label={t('pdf.split.more')}>
                  <PlusIcon />
                </Button>
                <span className="text-xs text-muted-foreground">{t('pdf.split.everyUnit', { count: every })}</span>
              </div>
            </OptionField>
          )}
          {mode === 'each' && <p className="text-xs text-muted-foreground">{t('pdf.split.eachHint', { count: total })}</p>}
          {mode === 'pick' && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{picked.size ? t('pdf.split.picked', { pages: describePages([...picked].sort((a, b) => a - b)) }) : t('pdf.split.pickHint')}</span>
              {picked.size > 0 && (
                <Button variant="ghost" size="xs" onClick={() => setPicked(new Set())}>
                  {t('pdf.split.clearPicked')}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </PanelSection>

      <PanelSection title={t('pdf.split.previewTitle', { count: groups.length })} icon={<ScissorsIcon />}>
        {groups.length > 0 && groups.length <= 24 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={t('pdf.split.files')}>
            {groups.map((group, index) => (
              <li key={index} className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 py-0.5 pr-2 pl-0.5 text-[11px]">
                <span className={cn('flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white', GROUP_TONES[index % GROUP_TONES.length].chip)}>
                  {index + 1}
                </span>
                <span className="tabular-nums text-muted-foreground">{describePages(group)}</span>
              </li>
            ))}
          </ul>
        )}
        <ol className={THUMB_GRID}>
          {doc.pages.map((info, index) => {
            const group = groupOf.get(index)
            const tone = group !== undefined ? GROUP_TONES[group % GROUP_TONES.length] : null
            const isPicked = picked.has(index)
            const content = (
              <PageThumb
                handle={doc.handle}
                index={index}
                info={info}
                label={t('fileui.page', { index: index + 1, total })}
                className={cn('transition-[opacity,box-shadow] duration-200', tone ? `ring-2 ${tone.ring}` : 'opacity-45')}
              >
                {tone && (
                  <span className={cn('absolute right-1 bottom-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm', tone.chip)}>
                    {t('pdf.split.fileChip', { index: (group ?? 0) + 1 })}
                  </span>
                )}
                {mode === 'pick' && (
                  <span
                    className={cn(
                      'absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full border-2 transition-all',
                      isPicked ? 'border-primary bg-primary text-primary-foreground' : 'border-white/90 bg-black/15',
                    )}
                    aria-hidden
                  >
                    {isPicked && <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                )}
              </PageThumb>
            )
            return (
              <li key={index}>
                {mode === 'pick' ? (
                  <button
                    type="button"
                    onClick={() => togglePick(index)}
                    aria-pressed={isPicked}
                    aria-label={t('fileui.page', { index: index + 1, total })}
                    className="block w-full cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ol>
      </PanelSection>

      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void split()} disabled={busy || !groups.length} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <ScissorsIcon aria-hidden />}
          {mode === 'pick' ? t('pdf.split.extract') : t('pdf.split.build', { count: groups.length })}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">
          {t('pdf.split.summary', { files: groups.length, pages: groupOf.size, total })}
        </span>
      </ActionBar>
    </div>
  )
}
