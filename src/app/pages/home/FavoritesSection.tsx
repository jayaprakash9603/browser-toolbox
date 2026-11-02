import { StarIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { toolRegistry, type ToolDefinition } from '@/core/registry'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp, StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

import './home-shortcuts.css'

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
        action={
          showManage && favorites.length > 0
            ? { to: '/favorites', label: t('home.manageFavorites') }
            : undefined
        }
        count={favorites.length}
      />
      {tools.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-dashed bg-muted/30 px-3 py-2.5">
          <StarIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
          <p className="text-tool-desc">{t('home.favoriteHint')}</p>
        </div>
      ) : (
        <StaggerChildren className="home-favorite-grid" stagger={0.025}>
          {tools.map((tool) => (
            <StaggerItem key={tool.id} className="min-w-0">
              <FavoriteChip tool={tool} />
            </StaggerItem>
          ))}
        </StaggerChildren>
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
      className="home-favorite-link group"
    >
      <span className="home-favorite-icon">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="home-shortcut-name">{name}</span>
    </Link>
  )
}
