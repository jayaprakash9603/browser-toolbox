import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { GlobeIcon, RadioIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { sumCounts, type AdblockTabEntry } from '@/core/adblock'
import { cn } from '@/shared/utils/cn'

import { AnimatedNumber } from '../AnimatedNumber'

const RECENT_MS = 6000

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function focusTab(tabId: number): void {
  void chrome.tabs
    .update(tabId, { active: true })
    .then((tab) => (tab?.windowId != null ? chrome.windows.update(tab.windowId, { focused: true }) : undefined))
    .catch(() => {})
}

export function LiveSites({
  tabs,
  activeTabId,
  limit,
}: {
  tabs: AdblockTabEntry[]
  activeTabId?: number
  limit?: number
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const now = useNow(2000)
  const visible = limit ? tabs.slice(0, limit) : tabs

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <RadioIcon className="size-3.5 text-emerald-500" />
        <h3 className="text-xs font-semibold">{t('adblock.liveTitle')}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {t('adblock.liveCount', { count: tabs.length })}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="py-3 text-center text-[11px] text-muted-foreground">{t('adblock.liveEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {visible.map((entry) => {
              const recent = now - entry.updatedAt < RECENT_MS
              const isYoutube = /(^|\.)youtube(-nocookie)?\.com$/.test(entry.host)
              return (
                <motion.li
                  key={entry.tabId}
                  layout={!reduceMotion}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => focusTab(entry.tabId)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
                      entry.tabId === activeTabId && 'bg-muted/60',
                    )}
                  >
                    {entry.favIconUrl ? (
                      <img src={entry.favIconUrl} alt="" className="size-4 shrink-0 rounded-sm" />
                    ) : (
                      <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{entry.host || entry.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {entry.tabId === activeTabId
                          ? t('adblock.liveActiveTab')
                          : isYoutube && entry.youtube > 0
                            ? t('adblock.liveYoutubeBackground', { count: entry.youtube })
                            : t('adblock.liveBackground')}
                      </p>
                    </div>
                    <span className="relative flex size-2 shrink-0">
                      {recent && !reduceMotion && (
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      )}
                      <span
                        className={cn(
                          'relative inline-flex size-2 rounded-full',
                          recent ? 'bg-emerald-500' : 'bg-emerald-500/40',
                        )}
                      />
                    </span>
                    <span className="min-w-8 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-center text-[11px] font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                      <AnimatedNumber value={sumCounts(entry)} />
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
