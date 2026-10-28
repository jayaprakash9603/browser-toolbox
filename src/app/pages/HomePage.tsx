import { useTranslation } from 'react-i18next'
import { InboxIcon } from 'lucide-react'

import { useScrollMemory } from '@/app/navigationMemory'
import { filterTools } from '@/features/search/filterTools'
import { toolRegistry } from '@/core/registry'
import { AllToolsCategories } from '@/app/pages/home/AllToolsCategories'
import { BottomTip } from '@/app/pages/home/BottomTip'
import { BundleJobBanner } from '@/app/pages/home/BundleJobBanner'
import { FavoritesSection } from '@/app/pages/home/FavoritesSection'
import { PopularTools } from '@/app/pages/home/PopularTools'
import { QuickActions } from '@/app/pages/home/QuickActions'
import { RecentSection } from '@/app/pages/home/RecentSection'
import { WelcomeStrip } from '@/app/pages/home/WelcomeStrip'
import { BackButton } from '@/shared/components/BackButton'
import { EmptyState } from '@/shared/components/EmptyState'
import { ToolCardGrid } from '@/shared/components/ToolCardGrid'
import { AppLoadingSkeleton } from '@/shared/components/AppLoadingSkeleton'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { useRecentTools } from '@/shared/hooks/useRecentTools'
interface HomePageProps {
  section?: 'favorites' | 'recent'
}

export default function HomePage({ section }: HomePageProps) {
  const { t } = useTranslation()
  const { favorites, isLoading: favoritesLoading } = useFavorites()
  const { recent, isLoading: recentLoading } = useRecentTools()
  const scrollRef = useScrollMemory<HTMLDivElement>()

  const loading =
    section === 'favorites'
      ? favoritesLoading
      : section === 'recent'
        ? recentLoading
        : favoritesLoading || recentLoading

  if (loading) {
    return <AppLoadingSkeleton variant={section ? 'collection' : 'home'} label={t('nav.loading')} />
  }

  if (section === 'favorites' || section === 'recent') {
    const tools = toolRegistry.getAll()
    const { favorites: favoriteTools, recent: recentTools } = filterTools(
      tools,
      '',
      favorites,
      recent.map((r) => r.toolId),
    )
    const list = section === 'favorites' ? favoriteTools : recentTools
    return (
      <div
        ref={scrollRef}
        className="scrollbar-styled @container h-full overflow-x-clip overflow-y-auto px-[var(--density-page-pad)] pb-6 pt-3"
      >
        <div className="mb-3">
          <BackButton />
        </div>
        <h1 className="text-section-title mb-4">
          {section === 'favorites' ? t('nav.favorites') : t('home.recentlyUsed')}
        </h1>
        {list.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={section === 'favorites' ? t('home.noFavorites') : t('home.noRecent')}
            description={section === 'favorites' ? t('home.favoriteHint') : t('home.noRecentHint')}
          />
        ) : (
          <ToolCardGrid tools={list} />
        )}
      </div>
    )
  }

  return (
    <div className="@container flex h-full min-w-0 flex-col overflow-x-clip">
      <div ref={scrollRef} className="scrollbar-styled min-h-0 flex-1 overflow-y-auto overflow-x-clip px-3 pb-6 @[360px]:px-4">
        <div className="mx-auto max-w-3xl pt-3">
          <BundleJobBanner />
          <WelcomeStrip favoriteCount={favorites.length} />
          <QuickActions />
          <RecentSection />
          <FavoritesSection />
          <PopularTools />
          <AllToolsCategories />
          <BottomTip />
        </div>
      </div>
    </div>
  )
}
