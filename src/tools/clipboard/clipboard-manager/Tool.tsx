import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ClipboardListIcon, RotateCcwIcon, SearchXIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { deleteEntry, restoreEntry, type ClipboardEntry } from '@/core/clipboard'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useClipboardWatcher } from '@/shared/hooks/useClipboardWatcher'
import { useTransformTool } from '@/tools/text/_shared'
import { ClearHistoryButton, HistoryItem } from '../_HistoryItem'
import {
  classifyClip,
  dateGroup,
  matchesFilter,
  type ClipFilter,
  type DateGroup,
} from '../clipKinds'
import { FilterTabs, type FilterOption } from './FilterTabs'

const PAGE_SIZE = 60
const UNDO_MS = 5000
const EASE = [0.2, 0.8, 0.2, 1] as const

const FILTER_LABELS: Record<ClipFilter, string> = {
  all: 'clipboard.all',
  pinned: 'clipboard.pinned',
  link: 'clipboard.filterLinks',
  code: 'clipboard.filterCode',
  text: 'clipboard.text',
}

type Section = 'pinned' | DateGroup

const SECTION_LABELS: Record<Section, string> = {
  pinned: 'clipboard.pinned',
  today: 'clipboard.groupToday',
  yesterday: 'clipboard.groupYesterday',
  earlier: 'clipboard.groupEarlier',
}

type Row =
  | { type: 'header'; key: string; section: Section; count: number }
  | { type: 'entry'; key: string; entry: ClipboardEntry; index: number }

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function EmptyHero() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col items-center gap-4 px-6 py-14 text-center"
    >
      <div className="relative isolate">
        <div className="absolute inset-0 -z-10 scale-[1.8] rounded-full bg-primary/15 blur-2xl" />
        <motion.div
          initial={reduceMotion ? false : { scale: 0.8, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
          className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-card shadow-[var(--shadow-card)]"
        >
          <ClipboardListIcon className="size-6 text-primary" aria-hidden />
        </motion.div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t('clipboard.empty')}</p>
        <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">
          {t('clipboard.emptyDescription')}
        </p>
      </div>
      <p className="rounded-full border bg-card px-3 py-1 text-[11px] text-muted-foreground">
        {t('clipboard.copyHint')}
      </p>
    </motion.div>
  )
}

export default function ClipboardManagerTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('clipboard.manager')
  const { entries, refresh } = useClipboardHistory()
  useClipboardWatcher()
  const reduceMotion = useReducedMotion()
  const now = useNow(30_000)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ClipFilter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [lastDeleted, setLastDeleted] = useState<ClipboardEntry | null>(null)
  const [settled, setSettled] = useState(false)
  const [mountedAt] = useState(() => Date.now())
  const undoTimer = useRef<number | undefined>(undefined)
  const listRef = useRef<HTMLUListElement>(null)

  const newest = entries.reduce((max, entry) => Math.max(max, entry.createdAt), 0)
  const capturedLive = newest > mountedAt

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 700)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(undoTimer.current)
    }
  }, [])

  const changeQuery = (value: string) => {
    setQuery(value)
    setLimit(PAGE_SIZE)
  }

  const changeFilter = (value: ClipFilter) => {
    setFilter(value)
    setLimit(PAGE_SIZE)
  }

  const classified = useMemo(
    () => entries.map((entry) => ({ entry, kind: classifyClip(entry.text) })),
    [entries],
  )

  const filterOptions = useMemo<FilterOption[]>(
    () =>
      (Object.keys(FILTER_LABELS) as ClipFilter[]).map((value) => ({
        value,
        label: t(FILTER_LABELS[value]),
        count: classified.filter(({ entry, kind }) => matchesFilter(entry, kind, value)).length,
      })),
    [classified, t],
  )

  const ordered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = classified
      .filter(
        ({ entry, kind }) =>
          matchesFilter(entry, kind, filter) && (!q || entry.text.toLowerCase().includes(q)),
      )
      .map(({ entry }) => entry)
      .sort((a, b) => b.createdAt - a.createdAt)
    return [...matches.filter((entry) => entry.pinned), ...matches.filter((entry) => !entry.pinned)]
  }, [classified, filter, query])

  const rows = useMemo<Row[]>(() => {
    const shown = ordered.slice(0, limit)
    const sectionOf = (entry: ClipboardEntry): Section =>
      entry.pinned && filter !== 'pinned' ? 'pinned' : dateGroup(entry.createdAt, now)
    const counts = new Map<Section, number>()
    for (const entry of shown) counts.set(sectionOf(entry), (counts.get(sectionOf(entry)) ?? 0) + 1)

    const result: Row[] = []
    let current: Section | null = null
    shown.forEach((entry, index) => {
      const section = sectionOf(entry)
      if (section !== current) {
        current = section
        result.push({
          type: 'header',
          key: `header-${section}`,
          section,
          count: counts.get(section) ?? 0,
        })
      }
      result.push({ type: 'entry', key: entry.id, entry, index })
    })
    return result
  }, [ordered, limit, filter, now])

  const remaining = ordered.length - Math.min(limit, ordered.length)
  const handleDelete = useCallback(
    async (entry: ClipboardEntry) => {
      setLastDeleted(entry)
      window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => setLastDeleted(null), UNDO_MS)
      await deleteEntry(entry.id)
      await refresh()
    },
    [refresh],
  )

  const undoDelete = async () => {
    if (!lastDeleted) return
    window.clearTimeout(undoTimer.current)
    const entry = lastDeleted
    setLastDeleted(null)
    await restoreEntry(entry)
    await refresh()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const cards = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[data-clip-copy]') ?? [],
    )
    if (cards.length === 0) return
    const target = event.target as HTMLElement
    if (target instanceof HTMLInputElement) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        cards[0].focus()
      }
      return
    }
    const index = cards.indexOf(target as HTMLButtonElement)
    if (index === -1) return
    event.preventDefault()
    const next = index + (event.key === 'ArrowDown' ? 1 : -1)
    cards[Math.max(0, Math.min(cards.length - 1, next))].focus()
  }

  const entryTransition = (index: number) => ({
    duration: 0.28,
    ease: EASE,
    delay: settled ? 0 : Math.min(index, 10) * 0.035,
  })

  return (
    <ToolPage
      tool={tool}
      backTo="/"
      contentClassName="overflow-hidden p-0"
      actions={entries.length > 0 && <ClearHistoryButton onChanged={refresh} />}
    >
      <div className="relative flex h-full min-h-0 flex-col" onKeyDown={onKeyDown}>
        {entries.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2 border-b bg-background px-[var(--density-page-pad)] pt-[var(--density-page-pad)] pb-2.5">
            <SearchInput
              value={query}
              onChange={changeQuery}
              placeholder={t('clipboard.search')}
              ariaLabel={t('clipboard.searchLabel')}
              shortcut="/"
            />
            <FilterTabs
              value={filter}
              onChange={changeFilter}
              options={filterOptions}
              ariaLabel={t('clipboard.filterLabel')}
            />
          </div>
        )}

        <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto px-[var(--density-page-pad)]">
          {entries.length === 0 ? (
            <EmptyHero />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={query ? t('common.noMatches') : t('clipboard.noFilterMatches')}
              className="py-14"
            />
          ) : (
            <ul ref={listRef} className="flex flex-col gap-2 py-3">
              <AnimatePresence initial mode="popLayout">
                {rows.map((row) =>
                  row.type === 'header' ? (
                    <motion.li
                      key={row.key}
                      layout={reduceMotion ? false : 'position'}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      className="flex items-center gap-2 px-1 pt-2 first:pt-0"
                    >
                      <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {t(SECTION_LABELS[row.section])}
                      </h2>
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                        {row.count}
                      </span>
                      <span className="h-px flex-1 bg-border" aria-hidden />
                    </motion.li>
                  ) : (
                    <motion.li
                      key={row.key}
                      layout={reduceMotion ? false : 'position'}
                      initial={
                        reduceMotion ? false : { opacity: 0, y: settled ? -10 : 12, scale: 0.98 }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: entryTransition(row.index),
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.96,
                        transition: { duration: 0.16, ease: 'easeIn' },
                      }}
                      transition={{ layout: { type: 'spring', stiffness: 420, damping: 38 } }}
                    >
                      <HistoryItem
                        entry={row.entry}
                        onChanged={refresh}
                        onDelete={handleDelete}
                        now={now}
                        fresh={capturedLive && row.entry.createdAt === newest}
                      />
                    </motion.li>
                  ),
                )}
              </AnimatePresence>
              {remaining > 0 && (
                <li>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setLimit((value) => value + PAGE_SIZE)}
                  >
                    {t('clipboard.showMore', { count: Math.min(PAGE_SIZE, remaining) })}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>

        <AnimatePresence>
          {lastDeleted && (
            <motion.div
              role="status"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="absolute inset-x-3 bottom-3 z-10 mx-auto flex w-full max-w-sm items-center gap-2 rounded-xl border bg-popover/95 py-1.5 pr-1.5 pl-3 text-xs shadow-lg backdrop-blur-md"
            >
              <Trash2Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t('clipboard.deleted')}</span>
              <Button
                size="xs"
                variant="ghost"
                className="text-primary hover:text-primary"
                onClick={() => void undoDelete()}
              >
                <RotateCcwIcon />
                {t('clipboard.undo')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolPage>
  )
}
