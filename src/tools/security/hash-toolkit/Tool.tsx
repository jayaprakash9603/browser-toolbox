import { useMemo, type ReactNode } from 'react'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { BadgeCheckIcon, FileSearchIcon, FingerprintIcon, KeyRoundIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'
import { useSecurityTool } from '../_shared'

import { ChecksumPanel } from './ChecksumPanel'
import { EvidencePanel } from './EvidencePanel'
import { HashHero } from './HashHero'
import { HmacPanel } from './HmacPanel'
import { IntegrityPanel } from './IntegrityPanel'
import { useFileHashQueue } from './useFileHashQueue'

const TABS = ['checksum', 'integrity', 'evidence', 'hmac'] as const

const TAB_ICON = {
  checksum: FingerprintIcon,
  integrity: BadgeCheckIcon,
  evidence: FileSearchIcon,
  hmac: KeyRoundIcon,
} as const

function TabReveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function HashToolkitTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.hash-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', TABS, 'checksum')
  const queue = useFileHashQueue()

  const stats = useMemo(() => {
    const hashed = queue.items.filter((item) => item.status === 'done').length
    const pending = queue.items.filter(
      (item) => item.status === 'pending' || item.status === 'hashing',
    ).length
    return { hashed, pending }
  }, [queue.items])

  return (
    <ToolPage
      tool={tool}
      contentClassName="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden @container"
    >
      <HashHero />

      {(stats.hashed > 0 || stats.pending > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          {stats.hashed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-800 dark:text-emerald-300">
              {t('hashToolkit.session.hashed', { count: stats.hashed })}
            </span>
          )}
          {stats.pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {t('hashToolkit.session.pending', { count: stats.pending })}
            </span>
          )}
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof TABS)[number])}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <TabsList className="scrollbar-styled h-auto w-full justify-start gap-0.5 overflow-x-auto p-0.5">
          {TABS.map((value) => {
            const Icon = TAB_ICON[value]
            return (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'gap-1.5 px-3 transition-[box-shadow,background-color] duration-200 motion-reduce:transition-none data-[state=active]:shadow-sm',
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                {t(`hashToolkit.tab.${value}`)}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent
          value="checksum"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <TabReveal>
            <ChecksumPanel
              items={queue.items}
              onEnqueue={queue.enqueue}
              onRemove={queue.remove}
              onClear={queue.clear}
              onPinBaseline={queue.pinBaseline}
            />
          </TabReveal>
        </TabsContent>

        <TabsContent
          value="integrity"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <TabReveal>
            <IntegrityPanel items={queue.hashedItems} />
          </TabReveal>
        </TabsContent>

        <TabsContent
          value="evidence"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <TabReveal>
            <EvidencePanel items={queue.items} />
          </TabReveal>
        </TabsContent>

        <TabsContent
          value="hmac"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <TabReveal>
            <HmacPanel />
          </TabReveal>
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
