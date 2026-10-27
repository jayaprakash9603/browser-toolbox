import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcwIcon } from 'lucide-react'

import { PROTECTION_FILES, type ThreatsFile } from '@/core/protection'
import { sendMessage } from '@/core/messaging'
import { CategoryToggles, GuardToggles } from '@/features/protection/components/CategoryToggles'
import { ProtectionSuite } from '@/features/protection/components/ProtectionSuite'
import { ProtectionToolHeader } from '@/features/protection/components/ProtectionToolHeader'
import { RecentBlocked } from '@/features/protection/components/RecentBlocked'
import { TrustedSitesEditor } from '@/features/protection/components/TrustedSitesEditor'
import { useProtection } from '@/features/protection/useProtection'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion/StaggerChildren'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'

import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { usePrivacyTool } from '../_shared'

export default function WebProtectionTool() {
  const { t } = useTranslation()
  const tool = usePrivacyTool('privacy.web-protection')
  const { state, stats, patch, refreshStats } = useProtection()
  const [threats, setThreats] = useState<ThreatsFile | null>(null)
  useFocusTarget()

  useEffect(() => {
    void fetch(chrome.runtime.getURL(PROTECTION_FILES.threatsJson))
      .then((r) => r.json())
      .then((data: ThreatsFile) => setThreats(data))
      .catch(() => setThreats(null))
  }, [])

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
          <ProtectionToolHeader
            enabled={state.enabled}
            stats={stats}
            onToggle={(enabled) => onPatch({ enabled })}
          />
        </StaggerItem>
        <PermissionNotice active={state.enabled} message={t('siteAccess.protectionNeeded')} />
        <StaggerItem>
          <div data-search-id="categories">
            <h3 className="mb-2 text-xs font-semibold">{t('protection.categoriesTitle')}</h3>
            <CategoryToggles
              state={state}
              threats={threats}
              disabled={!state.enabled}
              onPatch={onPatch}
            />
          </div>
        </StaggerItem>
        <StaggerItem>
          <div data-search-id="guards">
            <h3 className="mb-2 text-xs font-semibold">{t('protection.guardsTitle')}</h3>
            <GuardToggles state={state} disabled={!state.enabled} onPatch={onPatch} />
          </div>
        </StaggerItem>
        <StaggerItem>
          <div data-search-id="suite">
            <h3 className="mb-2 text-xs font-semibold">{t('protection.suiteTitle')}</h3>
            <ProtectionSuite />
          </div>
        </StaggerItem>
        <StaggerItem>
          <h3 className="mb-2 text-xs font-semibold">{t('protection.recent.title')}</h3>
          <RecentBlocked stats={stats} />
        </StaggerItem>
        <StaggerItem>
          <h3 className="mb-2 text-xs font-semibold">{t('protection.trusted.title')}</h3>
          <TrustedSitesEditor trusted={state.trusted} onChange={(trusted) => onPatch({ trusted })} />
        </StaggerItem>
        {threats && (
          <StaggerItem>
            <p className="text-[11px] text-muted-foreground">
              {t('protection.listsFooter', {
                count: threats.counts.total,
                date: new Date(threats.generated).toLocaleDateString(),
              })}
            </p>
          </StaggerItem>
        )}
        <StaggerItem>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              void sendMessage({ type: 'PROTECTION_RESET_STATS' }).then(() => refreshStats())
            }}
          >
            <RotateCcwIcon className="mr-1 size-3.5" />
            {t('protection.resetTotals')}
          </Button>
        </StaggerItem>
      </StaggerChildren>
    </ToolPage>
  )
}
