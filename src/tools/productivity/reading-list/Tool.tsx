import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookmarkPlusIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Trash2Icon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Textarea } from '@/shared/components/ui/textarea'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import {
  exportReadingMarkdown,
  filterReadingList,
  loadReadingList,
  newReadingItem,
  saveReadingList,
  type ReadingItem,
} from './model'

type ReadFilter = 'all' | 'unread' | 'read'

async function readActiveTab(): Promise<{ url: string; title: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url || tab.url.startsWith('chrome://')) return null
  return { url: tab.url, title: tab.title ?? tab.url }
}

export default function ReadingListTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.reading-list')
  const reduce = useReducedMotion()
  const [items, setItems] = useState<ReadingItem[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ReadFilter>('all')
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    void loadReadingList().then((list) => {
      setItems(list)
      setLoaded(true)
    })
  }, [])

  const persist = useCallback(async (next: ReadingItem[]) => {
    setItems(next)
    await saveReadingList(next)
  }, [])

  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 2800)
  }

  const visible = useMemo(() => filterReadingList(items, query, filter), [items, query, filter])
  const unread = items.filter((i) => !i.read).length

  const savePage = async () => {
    const tab = await readActiveTab()
    if (!tab) {
      notify(t('readingList.noTab'))
      return
    }
    const item = newReadingItem({ ...tab, note })
    await persist([item, ...items])
    setNote('')
    notify(t('readingList.saved'))
  }

  const toggleRead = (id: string) => {
    void persist(items.map((i) => (i.id === id ? { ...i, read: !i.read } : i)))
  }

  const remove = (id: string) => {
    void persist(items.filter((i) => i.id !== id))
    notify(t('readingList.removed'))
  }

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <ToolSearchLayout
        header={
          <>
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('readingList.search')}
                ariaLabel={t('readingList.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <Button size="sm" className="shrink-0" onClick={() => void savePage()}>
                <BookmarkPlusIcon />
                {t('readingList.savePage')}
              </Button>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('readingList.notePlaceholder')}
              aria-label={t('readingList.notePlaceholder')}
              className="min-h-16 resize-none text-xs"
            />
            <Segmented
              size="sm"
              ariaLabel={t('readingList.filterLabel')}
              value={filter}
              onValueChange={(v) => setFilter(v as ReadFilter)}
              options={[
                { value: 'all', label: t('readingList.filter.all') },
                { value: 'unread', label: t('readingList.filter.unread', { count: unread }) },
                { value: 'read', label: t('readingList.filter.read') },
              ]}
            />
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="xs"
                variant="outline"
                disabled={!visible.length}
                onClick={() => downloadBlob(new Blob([exportReadingMarkdown(visible)], { type: 'text/markdown' }), 'reading-list.md')}
              >
                <DownloadIcon />
                {t('readingList.export')}
              </Button>
            </div>
          </>
        }
        bodyClassName="py-3"
        footer={
          <ProductivityStatusBar>
            {toast ?? t('readingList.summary', { total: items.length, unread, shown: visible.length })}
          </ProductivityStatusBar>
        }
      >
        {!loaded ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-20 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <BookmarkPlusIcon className="size-9 text-primary/70" aria-hidden />
            <p className="text-sm font-medium">{t('readingList.emptyTitle')}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t('readingList.emptyHint')}</p>
          </div>
        ) : (
          <StaggerChildren className="space-y-2" stagger={0.045}>
            {visible.map((item) => (
              <StaggerItem key={item.id}>
                <motion.article
                  layout={!reduce}
                  className={cn(
                    'rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm',
                    !item.read && 'border-primary/25 bg-primary/[0.03]',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRead(item.id)}
                      aria-pressed={item.read}
                      aria-label={item.read ? t('readingList.markUnread') : t('readingList.markRead')}
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        item.read ? 'bg-muted text-muted-foreground' : 'border-primary/40 bg-primary/10 text-primary',
                      )}
                    >
                      <CheckIcon className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{item.url}</p>
                      {item.note && <p className="mt-1.5 text-xs text-muted-foreground">{item.note}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <Button size="icon-xs" variant="ghost" aria-label={t('readingList.open')} onClick={() => void chrome.tabs.create({ url: item.url })}>
                        <ExternalLinkIcon />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={t('readingList.copyLink')}
                        onClick={() => void navigator.clipboard.writeText(item.url)}
                      >
                        <CopyIcon />
                      </Button>
                      <Button size="icon-xs" variant="ghost" aria-label={t('readingList.delete')} onClick={() => remove(item.id)}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                </motion.article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>
    </ToolPage>
  )
}
