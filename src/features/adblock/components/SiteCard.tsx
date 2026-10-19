import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { GlobeIcon, RotateCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  addAllowlistHost,
  hostnameFromUrl,
  isAllowlisted,
  removeAllowlistHost,
  sumCounts,
  type AdblockState,
  type AdblockTabEntry,
  type AdblockTotals,
} from '@/core/adblock'
import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { AnimatedNumber } from '../AnimatedNumber'
import type { ActiveTabInfo } from '../useAdblockLive'

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="flex-1 rounded-lg bg-background/60 px-2 py-1.5 text-center">
      <motion.div
        key={value}
        initial={reduceMotion || !value ? false : { scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.45 }}
        className={cn('text-lg leading-tight font-bold tabular-nums', highlight && 'text-emerald-600')}
      >
        <AnimatedNumber value={value} />
      </motion.div>
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
    </div>
  )
}

export function SiteCard({
  state,
  activeTab,
  entry,
  totals,
}: {
  state: AdblockState
  activeTab: ActiveTabInfo | null
  entry: AdblockTabEntry | null
  totals: AdblockTotals
}) {
  const { t } = useTranslation()
  const [needsReload, setNeedsReload] = useState(false)
  const host = hostnameFromUrl(activeTab?.url)
  const isWeb = Boolean(host && /^https?:/.test(activeTab?.url ?? ''))
  const paused = host ? isAllowlisted(state.allowlist, activeTab?.url ?? '') : false
  const blocking = state.enabled && isWeb && !paused
  const pageCount = sumCounts(entry)

  const toggleSite = async (on: boolean) => {
    if (!host) return
    if (on) await removeAllowlistHost(host)
    else await addAllowlistHost(host)
    setNeedsReload(true)
  }

  const reload = () => {
    setNeedsReload(false)
    void sendMessage({ type: 'ADBLOCK_RELOAD_TAB', tabId: activeTab?.id })
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-3 flex items-center gap-2">
        {activeTab?.favIconUrl ? (
          <img src={activeTab.favIconUrl} alt="" className="size-5 rounded-sm" />
        ) : (
          <GlobeIcon className="size-5 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{t('adblock.thisWebsite')}</p>
          <p className="truncate text-xs font-semibold">{isWeb ? host : t('adblock.noTab')}</p>
        </div>
        <Switch
          checked={!paused}
          disabled={!isWeb || !state.enabled}
          onCheckedChange={(checked) => void toggleSite(checked)}
          aria-label={t('adblock.siteToggle')}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={blocking ? 'on' : 'off'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'mb-3 flex items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium',
            blocking ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
          )}
        >
          <span className="relative flex size-2">
            {blocking && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />}
            <span className={cn('relative inline-flex size-2 rounded-full', blocking ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
          </span>
          {blocking
            ? t('adblock.blockingActive')
            : !state.enabled
              ? t('adblock.protectionOff')
              : paused
                ? t('adblock.sitePaused')
                : t('adblock.notApplicable')}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2">
        <Stat label={t('adblock.onThisPage')} value={pageCount} highlight={blocking} />
        <Stat label={t('adblock.inTotal')} value={sumCounts(totals)} />
      </div>

      {entry && pageCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {t('adblock.breakdownNetwork', { count: entry.network })}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5">
            {t('adblock.breakdownElements', { count: entry.hidden })}
          </span>
          {entry.youtube > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
              {t('adblock.breakdownYoutube', { count: entry.youtube })}
            </span>
          )}
        </div>
      )}

      <AnimatePresence>
        {needsReload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-dashed p-2">
              <p className="text-[11px] text-muted-foreground">{t('settings.adblockReloadHint')}</p>
              <Button type="button" size="sm" variant="outline" onClick={reload}>
                <RotateCwIcon className="mr-1 size-3.5" />
                {t('adblock.reloadTab')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
