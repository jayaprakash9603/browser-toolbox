import { StarIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { toolRegistry } from '@/core/registry'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { ToolCardGrid } from '@/shared/components/ToolCardGrid'
import { useFavorites } from '@/shared/hooks/useFavorites'

interface FavoritesSectionProps {
  delay?: number
  limit?: number
  showManage?: boolean
}

export function FavoritesSection({
  delay = 0.33,
  limit = 4,
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
        action={showManage ? { to: '/favorites', label: t('home.manageFavorites') } : undefined}
        count={favorites.length}
      />
      {tools.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-4 text-center text-tool-desc">
          {t('home.favoriteHint')}
        </p>
      ) : (
        <ToolCardGrid tools={tools} />
      )}
    </SlideUp>
  )
}
