import { StarIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { toolRegistry, type ToolDefinition } from '@/core/registry'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { ChipRail } from '@/shared/components/ChipRail'
import { SlideUp } from '@/shared/components/motion'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

interface FavoritesSectionProps {
  delay?: number
  limit?: number
  showManage?: boolean
}

export function FavoritesSection({
  delay = 0.18,
  limit = 24,
  showManage = true,
}: FavoritesSectionProps) {
  const { t } = useTranslation()
  const { favorites } = useFavorites()

  const tools = useMemo(
    () =>
      favorites
        .slice(0, limit)
        .map((id) => toolRegistry.get(id))
        .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool)),
    [favorites, limit],
  )

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader
        title={t('nav.favorites')}
        icon={StarIcon}
        action={showManage && favorites.length > 0 ? { to: '/favorites', label: t('home.manageFavorites') } : undefined}
        count={favorites.length}
      />
      {tools.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-dashed bg-muted/30 px-3 py-2.5">
          <StarIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
          <p className="text-tool-desc">{t('home.favoriteHint')}</p>
        </div>
      ) : (
        <ChipRail role="list" label={t('nav.favorites')}>
          {tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              role="listitem"
              className="shrink-0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + Math.min(index, 8) * 0.035, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <FavoriteChip tool={tool} />
            </motion.div>
          ))}
        </ChipRail>
      )}
    </SlideUp>
  )
}

function FavoriteChip({ tool }: { tool: ToolDefinition }) {
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
      className="group flex min-h-10 max-w-56 items-center gap-1.5 rounded-full border bg-card py-1 pr-3 pl-1 whitespace-nowrap shadow-xs outline-none transition-[border-color,background-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-amber-400/60 hover:bg-amber-500/5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 transition-transform duration-150 group-hover:scale-105 dark:text-amber-400">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="truncate text-xs font-medium">{name}</span>
    </Link>
  )
}
