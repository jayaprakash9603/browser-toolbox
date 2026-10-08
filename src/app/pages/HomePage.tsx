import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, ClockIcon, InboxIcon, SearchIcon, StarIcon } from 'lucide-react'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { filterTools } from '@/features/search/filterTools'
import { EmptyState } from '@/shared/components/EmptyState'
import { BackButton } from '@/shared/components/BackButton'
import { ToolCard } from '@/shared/components/ToolCard'
import { SearchInput } from '@/shared/components/SearchInput'
import { SmartSuggestions } from '@/shared/components/SmartSuggestions'
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
  const {
    favorites: favoriteTools,
    recent: recentTools,
    results,
  } = useMemo(
    () =>
      filterTools(tools, query, favorites, recent.map((r) => r.toolId)),
    [tools, query, favorites, recent],
  )

  const searching = query.trim().length > 0
  const enabledCategories = categoryRegistry.getEnabled()
  const comingSoon = categoryRegistry.getAll().filter((c) => !c.enabled)
  const loading =
    section === 'favorites'
      ? favoritesLoading
      : section === 'recent'
        ? recentLoading
        : favoritesLoading || recentLoading

  if (loading) {
    return <AppLoadingSkeleton variant={section ? 'collection' : 'home'} label={t('nav.loading')} />
  }

  return (
    <div className="scrollbar-styled h-full px-4 pt-4 pb-6">
      {!section && (
        <div className="mb-4">
          <h1 className="text-lg font-semibold tracking-tight">{t('home.title')}</h1>
          <p className="text-[13px] text-muted-foreground">{t('home.subtitle')}</p>
        </div>
      )}

      {section && (
        <div className="mb-3">
          <BackButton />
        </div>
      )}

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t('nav.searchTools')}
        ariaLabel={t('nav.searchTools')}
        shortcut="/"
        className="mb-4"
      />

      {!searching && !section && <SmartSuggestions />}

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
            <Section
              title={t('nav.favorites')}
              icon={StarIcon}
              link={{ to: '/favorites', label: t('common.viewAll') }}
              count={favoriteTools.length}
            >
              <ToolGrid tools={favoriteTools.slice(0, 3)} />
            </Section>
          )}

          {recentTools.length > 0 && (
            <Section
              title={t('home.recentlyUsed')}
              icon={ClockIcon}
              link={{ to: '/recent', label: t('common.viewAll') }}
              count={recentTools.length}
            >
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
                description={t(`categories.${category.id}.description`, {
                  defaultValue: category.description,
                })}
                icon={category.icon}
                link={{ to: `/categories/${category.id}`, label: t('common.viewAll') }}
                count={categoryTools.length}
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
                    className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
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
  count,
  children,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  link?: { to: string; label: string }
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
              {title}
              {count !== undefined && (
                <span className="rounded-full bg-muted px-1.5 text-[11px] leading-4 font-medium text-muted-foreground tabular-nums">
                  {count}
                </span>
              )}
            </h2>
            {description && (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {link && (
          <Link
            to={link.to}
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {link.label}
            <ChevronRightIcon className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function ToolGrid({ tools }: { tools: ReturnType<typeof toolRegistry.getAll> }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2.5 @[360px]:grid-cols-2 @[560px]:grid-cols-3')}>
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
