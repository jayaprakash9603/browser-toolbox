import { ClockIcon, InboxIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { toolRegistry } from '@/core/registry'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { ToolCardGrid } from '@/shared/components/ToolCardGrid'
import { useRecentTools } from '@/shared/hooks/useRecentTools'

interface RecentSectionProps {
  delay?: number
  limit?: number
  showViewAll?: boolean
}

export function RecentSection({ delay = 0.22, limit = 4, showViewAll = true }: RecentSectionProps) {
  const { t } = useTranslation()
  const { recent } = useRecentTools()

  const tools = useMemo(() => {
    return recent
      .slice(0, limit)
      .map((entry) => toolRegistry.get(entry.toolId))
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
  }, [recent, limit])

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader
        title={t('home.recentlyUsed')}
        icon={ClockIcon}
        action={showViewAll ? { to: '/recent', label: t('home.viewAll') } : undefined}
        count={recent.length}
      />
      {tools.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 px-3 py-4">
          <InboxIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-tool-name">{t('home.noRecent')}</p>
            <p className="text-tool-desc">{t('home.noRecentHint')}</p>
          </div>
        </div>
      ) : (
        <ToolCardGrid tools={tools} />
      )}
    </SlideUp>
  )
}
