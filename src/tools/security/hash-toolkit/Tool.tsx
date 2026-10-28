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

export default function HashToolkitTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.hash-toolkit')
  const reduce = useReducedMotion()
  const [tab, setTab] = useDeepLinkTab('tab', TABS, 'checksum')
  const queue = useFileHashQueue()

  return (
    <ToolPage
      tool={tool}
      contentClassName="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden @container"
    >
      <HashHero />
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
                className={cn('gap-1.5 px-3 data-[state=active]:shadow-sm')}
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
          <motion.div
            key="checksum"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChecksumPanel
              items={queue.items}
              onEnqueue={queue.enqueue}
              onRemove={queue.remove}
              onClear={queue.clear}
              onPinBaseline={queue.pinBaseline}
            />
          </motion.div>
        </TabsContent>

        <TabsContent
          value="integrity"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <IntegrityPanel items={queue.hashedItems} />
        </TabsContent>

        <TabsContent
          value="evidence"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <EvidencePanel items={queue.items} />
        </TabsContent>

        <TabsContent
          value="hmac"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <HmacPanel />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
