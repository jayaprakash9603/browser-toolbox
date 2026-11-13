import { useState } from 'react'
import { ChevronDownIcon, MoreVerticalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import type { HistoryPage, HistoryVisit } from '@/core/history-manager'
import { SiteFavicon } from '@/shared/components/SiteFavicon'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { HM_ROW } from './layout'
import { getUrlVisits } from './service'

export interface HistoryRowActions {
  onOpen: (url: string, mode: 'current' | 'tab' | 'window') => void
  onCopy: (text: string) => void
  onDelete: (page: HistoryPage) => void
  onSelect: (page: HistoryPage, on: boolean) => void
}

interface HistoryRowProps {
  page: HistoryPage
  selected: boolean
  compact?: boolean
  actions: HistoryRowActions
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(ts))
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(ts))
}

export function HistoryRow({ page, selected, compact, actions }: HistoryRowProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [visits, setVisits] = useState<HistoryVisit[] | null>(null)
  const [visitsLoading, setVisitsLoading] = useState(false)

  const loadVisits = async () => {
    if (visits !== null) {
      setOpen((v) => !v)
      return
    }
    setVisitsLoading(true)
    try {
      const rows = await getUrlVisits(page.url)
      setVisits(rows)
      setOpen(true)
    } finally {
      setVisitsLoading(false)
    }
  }

  return (
    <li className="list-none">
      <div data-selected={selected} className={cn(HM_ROW, compact && 'py-1')}>
        <Checkbox checked={selected} onCheckedChange={(v) => actions.onSelect(page, v === true)} aria-label="Select" />
        <SiteFavicon url={page.url} />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => actions.onOpen(page.url, 'tab')}
          title={page.url}
        >
          <p className="truncate text-sm font-medium leading-tight">{page.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {page.domain}
            {!compact && (
              <>
                {' · '}
                {formatDate(page.lastVisitTime)} {formatTime(page.lastVisitTime)}
              </>
            )}
            {compact && (
              <>
                {' · '}
                {formatTime(page.lastVisitTime)}
              </>
            )}
          </p>
        </button>
        {page.visitCount > 1 && (
          <span className="shrink-0 rounded-md bg-orange-500/12 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
            {page.visitCount}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon-xs" variant="ghost" aria-label="Actions">
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onOpen(page.url, 'current')}>{t('historyManager.open')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onOpen(page.url, 'tab')}>{t('historyManager.openTab')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onOpen(page.url, 'window')}>{t('historyManager.openWindow')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onCopy(page.url)}>{t('historyManager.copyUrl')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onCopy(page.title)}>{t('historyManager.copyTitle')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onCopy(`${page.title}\n${page.url}`)}>
              {t('historyManager.copyBoth')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void loadVisits()}>{t('historyManager.details')}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => actions.onDelete(page)}>
              {t('historyManager.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" size="icon-xs" variant="ghost" onClick={() => void loadVisits()} aria-expanded={open}>
          <ChevronDownIcon className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            className="overflow-hidden pl-9 pr-2"
          >
            <div className="border-l border-border/60 py-1 pl-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">{t('historyManager.visits.title')}</p>
              {visitsLoading && <p>{t('historyManager.loading')}</p>}
              {!visitsLoading && visits?.length === 0 && <p>{t('historyManager.visits.empty')}</p>}
              {visits?.map((v) => (
                <p key={v.visitId}>
                  {new Date(v.visitTime).toLocaleString()}
                  {v.transition ? ` · ${v.transition}` : ''}
                </p>
              ))}
              <p className="mt-1 break-all opacity-80">{page.url}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
