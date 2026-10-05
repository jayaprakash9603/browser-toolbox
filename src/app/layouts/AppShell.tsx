import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CommandIcon,
  HomeIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  ClockIcon,
} from 'lucide-react'

import { Link, useRouter } from '@/app/router'
import { getToolComponent } from '@/app/toolComponents'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { trackRecentTool } from '@/features/recent-tools/recentToolsService'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import {
  AppLoadingSkeleton,
  type AppLoadingSkeletonVariant,
} from '@/shared/components/AppLoadingSkeleton'
import { Button } from '@/shared/components/ui/button'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { Separator } from '@/shared/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

const HomePage = lazy(() => import('@/app/pages/HomePage'))
const SettingsPage = lazy(() => import('@/app/pages/SettingsPage'))
const CategoryPage = lazy(() => import('@/app/pages/CategoryPage'))
const LEGACY_CLIPBOARD_ROUTES = new Set([
  '/tools/clipboard/history',
  '/tools/clipboard/pinned',
  '/tools/clipboard/search',
])

export function AppShell({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const { path } = useRouter()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tool = useMemo(
    () => toolRegistry.getAll().find((t) => t.route === path),
    [path],
  )

  useEffect(() => {
    if (tool) void trackRecentTool(tool.id)
  }, [tool])

  const categories = categoryRegistry.getAll()
  const content = renderRoute(path)

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Link to="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CommandIcon className="size-3.5" />
          </div>
          <span className="text-sm font-semibold">{t('app.name')}</span>
        </Link>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('nav.openCommandPalette')}
            >
              <SearchIcon className="size-3.5" />
              <span className="hidden text-xs @[420px]:inline">{t('nav.searchTools')}</span>
              <kbd className="rounded border bg-muted px-1 text-[9px] font-medium">⌘K</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('nav.commandPalette')}</TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" aria-label={t('nav.settings')}>
              <Link to="/settings"><SettingsIcon /></Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('nav.settings')}</TooltipContent>
        </Tooltip>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t('nav.categories')}
          className="hidden w-12 flex-col items-center gap-1 border-r py-2 @[420px]:flex"
        >
          <NavItem to="/" icon={HomeIcon} label={t('nav.home')} active={path === '/'} />
          <NavItem to="/favorites" icon={StarIcon} label={t('nav.favorites')} active={path === '/favorites'} />
          <NavItem to="/recent" icon={ClockIcon} label={t('nav.recent')} active={path === '/recent'} />
          <Separator className="my-1 w-6" />
          {categories.map((category) => (
            <NavItem
              key={category.id}
              to={category.enabled ? `/categories/${category.id}` : '#'}
              icon={category.icon}
              label={category.enabled
                ? t(`categories.${category.id}.name`, { defaultValue: category.name })
                : t('nav.comingSoon', {
                    name: t(`categories.${category.id}.name`, { defaultValue: category.name }),
                  })}
              active={path === `/categories/${category.id}`}
              disabled={!category.enabled}
            />
          ))}
          <div className="flex-1" />
          <NavItem to="/settings" icon={SettingsIcon} label={t('nav.settings')} active={path === '/settings'} />
        </nav>

        <main className="@container min-w-0 flex-1 overflow-hidden">
          <Suspense
            fallback={
              <AppLoadingSkeleton
                variant={getLoadingVariant(path)}
                label={t('nav.loading')}
              />
            }
          >
            {content}
          </Suspense>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {children}
    </div>
  )
}

function renderRoute(path: string) {
  if (path === '/' || path === '') return <HomePage />
  if (path === '/settings') return <SettingsPage />
  if (path === '/favorites') return <HomePage section="favorites" />
  if (path === '/recent') return <HomePage section="recent" />
  if (LEGACY_CLIPBOARD_ROUTES.has(path)) return <ToolHost toolId="clipboard.manager" />
  const categoryMatch = path.match(/^\/categories\/([\w-]+)$/)
  if (categoryMatch) return <CategoryPage categoryId={categoryMatch[1]} />
  const tool = toolRegistry.getAll().find((t) => t.route === path)
  if (tool) return <ToolHost toolId={tool.id} />
  return <HomePage />
}

function getLoadingVariant(path: string): AppLoadingSkeletonVariant {
  if (path === '/settings') return 'settings'
  if (path === '/favorites' || path === '/recent') return 'collection'
  if (LEGACY_CLIPBOARD_ROUTES.has(path)) return 'tool'
  if (/^\/categories\/[\w-]+$/.test(path)) return 'category'
  if (toolRegistry.getAll().some((tool) => tool.route === path)) return 'tool'
  return 'home'
}

function ToolHost({ toolId }: { toolId: string }) {
  const { t } = useTranslation()
  const tool = toolRegistry.get(toolId)
  if (!tool) return <HomePage />
  const Component = getToolComponent(toolId, tool.loader)
  return (
    <Suspense fallback={<AppLoadingSkeleton variant="tool" label={t('nav.loading')} />}>
      {/* Lazy components are cached per toolId in getToolComponent, so identity
          is stable across renders even though creation happens on first visit. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Component />
    </Suspense>
  )
}

interface NavItemProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  disabled?: boolean
}

function NavItem({ to, icon: Icon, label, active, disabled }: NavItemProps) {
  const inner = (
    <div
      className={cn(
        'flex size-8 items-center justify-center rounded-md transition-colors',
        active && 'bg-accent text-accent-foreground',
        !active && !disabled && 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground',
        disabled && 'cursor-not-allowed opacity-30',
      )}
    >
      <Icon className="size-4" />
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span aria-disabled="true">{inner}</span>
        ) : (
          <Link to={to} aria-label={label} className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            {inner}
          </Link>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
