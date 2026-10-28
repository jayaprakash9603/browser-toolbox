import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { getDiscoverTools, tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { AnimatedCard } from '@/shared/components/motion/AnimatedCard'
import { SlideUp, StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import type { ToolDefinition } from '@/core/registry'

export function DiscoverSection({ delay = 0.12 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getDiscoverTools()
  if (!tools.length) return null

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.discover')} icon={SparklesIcon} />
      <p className="-mt-2 mb-3 text-xs leading-relaxed text-muted-foreground">{t('home.discoverHint')}</p>
      <StaggerChildren className="grid grid-cols-1 gap-2 @[480px]:grid-cols-3" stagger={0.07}>
        {tools.map((tool, index) => (
          <StaggerItem key={tool.id}>
            <DiscoverTile tool={tool} color={tileColor(index + 2)} />
          </StaggerItem>
        ))}
      </StaggerChildren>
    </SlideUp>
  )
}

function DiscoverTile({ tool, color }: { tool: ToolDefinition; color: string }) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  const preload = () => {
    void tool.loader()
  }
  return (
    <Link
      to={tool.route}
      title={description}
      onPointerEnter={preload}
      onFocus={preload}
      className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    >
      <AnimatedCard className="flex h-full flex-col gap-2 p-3">
        <div className="flex items-start gap-2.5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{
              background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 65%, black))`,
            }}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="mb-1 inline-flex rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent-foreground uppercase">
              {t('home.discoverBadge')}
            </span>
            <h3 className="truncate text-sm font-semibold">{name}</h3>
          </div>
        </div>
        <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">{description}</p>
      </AnimatedCard>
    </Link>
  )
}
