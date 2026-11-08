import { ZapIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { getQuickActionTools, tileColor } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp, StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

import './home-shortcuts.css'

export function QuickActions({ delay = 0.06 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getQuickActionTools()

  return (
    <SlideUp onceKey="home.quick-actions" delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.quickActions')} icon={ZapIcon} />
      <StaggerChildren
        onceKey="home.quick-actions.grid"
        className="home-quick-grid"
        stagger={0.045}
      >
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
      className="home-quick-link group"
      style={{ '--shortcut-accent': color } as CSSProperties}
    >
      <span className="home-quick-icon">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="home-shortcut-name">{name}</span>
    </Link>
  )
}
