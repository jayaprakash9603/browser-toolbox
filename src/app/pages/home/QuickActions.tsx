import { ZapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { getQuickActionTools, tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp, StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

export function QuickActions({ delay = 0.06 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getQuickActionTools()

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.quickActions')} icon={ZapIcon} />
      <StaggerChildren className="grid grid-cols-4 gap-1 rounded-2xl border bg-card p-1.5 shadow-[var(--shadow-card)]" stagger={0.06}>
        {tools.map((tool, index) => (
          <StaggerItem key={tool.id} className="min-w-0">
            <QuickActionTile tool={tool} color={tileColor(index)} />
          </StaggerItem>
        ))}
      </StaggerChildren>
    </SlideUp>
  )
}

function QuickActionTile({ tool, color }: { tool: ToolDefinition; color: string }) {
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
      className="group flex min-h-11 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
    >
      <span
        className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        style={{
          background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 70%, black))`,
        }}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="line-clamp-2 w-full text-[11px] leading-tight font-medium">{name}</span>
    </Link>
  )
}
