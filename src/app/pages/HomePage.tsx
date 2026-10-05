import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClockIcon, InboxIcon, SearchIcon, StarIcon } from 'lucide-react'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { filterTools } from '@/features/search/filterTools'
import { EmptyState } from '@/shared/components/EmptyState'
import { BackButton } from '@/shared/components/BackButton'
import { ToolCard } from '@/shared/components/ToolCard'
import { SearchInput } from '@/shared/components/SearchInput'
import { AppLoadingSkeleton } from '@/shared/components/AppLoadingSkeleton'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { useRecentTools } from '@/shared/hooks/useRecentTools'
import { Link } from '@/app/router'
import { cn } from '@/shared/utils/cn'

interface HomePageProps {
  section?: 'favorites' | 'recent'
}

export default function HomePage({ section }: HomePageProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const { favorites, isLoading: favoritesLoading } = useFavorites()
  const { recent, isLoading: recentLoading } = useRecentTools()

  const tools = toolRegistry.getAll()
  const { favorites: favoriteTools, recent: recentTools, results } = useMemo(
    () => filterTools(tools, query, favorites, recent.map((r) => r.toolId), (tool) => [
      t(`tools.${tool.id}.name`, { defaultValue: tool.name }),
      t(`tools.${tool.id}.description`, { defaultValue: tool.description }),
    ]),
    [tools, query, favorites, recent, t],
  )

  const searching = query.trim().length > 0
  const enabledCategories = categoryRegistry.getEnabled()
  const comingSoon = categoryRegistry.getAll().filter((c) => !c.enabled)
  const loading = section === 'favorites'
    ? favoritesLoading
    : section === 'recent'
      ? recentLoading
      : favoritesLoading || recentLoading

  if (loading) {
    return <AppLoadingSkeleton variant={section ? 'collection' : 'home'} label={t('nav.loading')} />
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {!section && (
        <div className="mb-4">
          <h1 className="text-base font-semibold">{t('home.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('home.subtitle')}</p>
        </div>
      )}

      {section && <div className="mb-3"><BackButton /></div>}

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t('nav.searchToolsShortcut')}
        ariaLabel={t('nav.searchTools')}
        className="mb-4"
      />

      {searching && (
        <Section title={t('home.searchResults', { count: results.length })}>
          {results.length === 0 ? (
            <EmptyState icon={SearchIcon} title={t('home.noSearchResults')} />
          ) : (
            <ToolGrid tools={results} />
          )}
        </Section>
      )}

      {!searching && section === 'favorites' && (
        <Section title={t('nav.favorites')}>
          {favoriteTools.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title={t('home.noFavorites')}
              description={t('home.favoriteHint')}
            />
          ) : (
            <ToolGrid tools={favoriteTools} />
          )}
        </Section>
      )}

      {!searching && section === 'recent' && (
        <Section title={t('home.recentlyUsed')}>
          {recentTools.length === 0 ? (
            <EmptyState icon={InboxIcon} title={t('home.noRecent')} />
          ) : (
            <ToolGrid tools={recentTools} />
          )}
        </Section>
      )}

      {!searching && !section && (
        <>
          {favoriteTools.length > 0 && (
            <Section title={t('nav.favorites')} icon={StarIcon} link={{ to: '/favorites', label: t('common.viewAll') }}>
              <ToolGrid tools={favoriteTools.slice(0, 3)} />
            </Section>
          )}

          {recentTools.length > 0 && (
            <Section title={t('home.recentlyUsed')} icon={ClockIcon} link={{ to: '/recent', label: t('common.viewAll') }}>
              <ToolGrid tools={recentTools.slice(0, 3)} />
            </Section>
          )}

          {enabledCategories.map((category) => {
            const categoryTools = toolRegistry.getByCategory(category.id)
            if (categoryTools.length === 0) return null
            return (
              <Section
                key={category.id}
                title={t(`categories.${category.id}.name`, { defaultValue: category.name })}
                description={t(`categories.${category.id}.description`, { defaultValue: category.description })}
                icon={category.icon}
                link={{ to: `/categories/${category.id}`, label: t('common.viewAll') }}
              >
                <ToolGrid tools={categoryTools.slice(0, 3)} />
              </Section>
            )
          })}

          {comingSoon.length > 0 && (
            <Section title={t('home.comingSoon')}>
              <div className="flex flex-wrap gap-1.5">
                {comingSoon.map((category) => (
                  <span
                    key={category.id}
                    className="rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {t(`categories.${category.id}.name`, { defaultValue: category.name })}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  description,
  icon: Icon,
  link,
  children,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  link?: { to: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-primary" />}
          <div className="min-w-0">
            <h2 className="text-xs font-semibold">{title}</h2>
            {description && <p className="truncate text-[10px] text-muted-foreground">{description}</p>}
          </div>
        </div>
        {link && (
          <Link to={link.to} className="text-[11px] text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function ToolGrid({ tools }: { tools: ReturnType<typeof toolRegistry.getAll> }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2 @[360px]:grid-cols-2 @[560px]:grid-cols-3')}>
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
