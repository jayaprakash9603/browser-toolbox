import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { getQuickActionTools } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'

const TILE_VARS = ['var(--tile-1)', 'var(--tile-2)', 'var(--tile-3)', 'var(--tile-4)'] as const

export function QuickActions({ delay = 0.11 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getQuickActionTools()

  return (
    <SlideUp delay={delay} className="mb-5">
      <SectionHeader title={t('home.quickActions')} />
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool, index) => (
          <QuickActionTile key={tool.id} tool={tool} tileColor={TILE_VARS[index % TILE_VARS.length]} />
        ))}
      </div>
    </SlideUp>
  )
}

function QuickActionTile({
  tool,
  tileColor,
}: {
  tool: ReturnType<typeof getQuickActionTools>[number]
  tileColor: string
}) {
  const Icon = tool.icon
  const { name } = useToolLabels(tool)
  return (
    <Link
      to={tool.route}
      className={cn(
        'flex min-h-11 items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-[var(--shadow-card)] outline-none transition-[transform,box-shadow] duration-150',
        'hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: tileColor }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="text-tool-name line-clamp-2">{name}</span>
    </Link>
  )
}
