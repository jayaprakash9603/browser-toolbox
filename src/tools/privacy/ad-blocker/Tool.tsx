import { useTranslation } from 'react-i18next'
import { RotateCcwIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { LiveSites } from '@/features/adblock/components/LiveSites'
import { PlusFeatures } from '@/features/adblock/components/PlusFeatures'
import { ProtectionHeader } from '@/features/adblock/components/ProtectionHeader'
import { SiteCard } from '@/features/adblock/components/SiteCard'
import { useAdblock } from '@/features/adblock/useAdblock'
import { useAdblockLive } from '@/features/adblock/useAdblockLive'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion/StaggerChildren'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'

import { usePrivacyTool } from '../_shared'
import { AllowlistEditor } from './AllowlistEditor'
import { FilterListToggles } from './FilterListToggles'

export default function AdBlockerTool() {
  const { t } = useTranslation()
  const tool = usePrivacyTool('privacy.ad-blocker')
  const { state, patch } = useAdblock()
  const live = useAdblockLive()

  if (!state) {
    return (
      <ToolPage tool={tool}>
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      </ToolPage>
    )
  }

  const onPatch = (next: Parameters<typeof patch>[0]) => void patch(next)

  return (
    <ToolPage tool={tool}>
      <StaggerChildren className="flex flex-col gap-3">
        <StaggerItem>
          <ProtectionHeader
            enabled={state.enabled}
            totals={live.totals}
            onToggle={(enabled) => onPatch({ enabled })}
          />
        </StaggerItem>
        <StaggerItem>
          <SiteCard
            state={state}
            activeTab={live.activeTab}
            entry={live.activeEntry}
            totals={live.totals}
          />
        </StaggerItem>
        <StaggerItem>
          <LiveSites tabs={live.liveTabs} activeTabId={live.activeTab?.id} />
        </StaggerItem>
        <StaggerItem>
          <PlusFeatures state={state} onPatch={onPatch} />
        </StaggerItem>
        <StaggerItem>
          <h3 className="mb-2 text-xs font-semibold">{t('adblock.filterLists')}</h3>
          <FilterListToggles state={state} disabled={!state.enabled} onPatch={onPatch} />
        </StaggerItem>
        <StaggerItem>
          <h3 className="mb-2 text-xs font-semibold">{t('adblock.allowlistTitle')}</h3>
          <AllowlistEditor
            allowlist={state.allowlist}
            onChange={(allowlist) => onPatch({ allowlist })}
          />
        </StaggerItem>
        <StaggerItem>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => void sendMessage({ type: 'ADBLOCK_RESET_TOTALS' })}
          >
            <RotateCcwIcon className="mr-1 size-3.5" />
            {t('adblock.resetTotals')}
          </Button>
        </StaggerItem>
      </StaggerChildren>
    </ToolPage>
  )
}
