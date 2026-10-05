import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CommandIcon,
  HomeIcon,
  SettingsIcon,
  StarIcon,
  ClockIcon,
} from 'lucide-react'

import { Link, useRouter } from '@/app/router'
import { getToolComponent } from '@/app/toolComponents'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { trackRecentTool } from '@/features/recent-tools/recentToolsService'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

const HomePage = lazy(() => import('@/app/pages/HomePage'))
const SettingsPage = lazy(() => import('@/app/pages/SettingsPage'))
const CategoryPage = lazy(() => import('@/app/pages/CategoryPage'))

function PageLoading() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading…
    </div>
  )
}

export function AppShell({ children }: { children?: ReactNode }) {
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
          <span className="text-sm font-semibold">Toolbox</span>
        </Link>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <span className="text-xs">Search tools…</span>
              <kbd className="rounded border bg-muted px-1 text-[9px] font-medium">⌘K</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Command palette</TooltipContent>
        </Tooltip>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Categories"
          className="hidden w-12 flex-col items-center gap-1 border-r py-2 @[420px]:flex"
        >
          <NavItem to="/" icon={HomeIcon} label="Home" active={path === '/'} />
          <NavItem to="/favorites" icon={StarIcon} label="Favorites" active={path === '/favorites'} />
          <NavItem to="/recent" icon={ClockIcon} label="Recent" active={path === '/recent'} />
          <Separator className="my-1 w-6" />
          {categories.map((category) => (
            <NavItem
              key={category.id}
              to={category.enabled ? `/categories/${category.id}` : '#'}
              icon={category.icon}
              label={category.enabled ? category.name : `${category.name} (coming soon)`}
              active={path === `/categories/${category.id}`}
              disabled={!category.enabled}
            />
          ))}
          <div className="flex-1" />
          <NavItem to="/settings" icon={SettingsIcon} label="Settings" active={path === '/settings'} />
        </nav>

        <main className="min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={<PageLoading />}>{content}</Suspense>
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
  const categoryMatch = path.match(/^\/categories\/([\w-]+)$/)
  if (categoryMatch) return <CategoryPage categoryId={categoryMatch[1]} />
  const tool = toolRegistry.getAll().find((t) => t.route === path)
  if (tool) return <ToolHost toolId={tool.id} />
  return <HomePage />
}

function ToolHost({ toolId }: { toolId: string }) {
  const tool = toolRegistry.get(toolId)
  if (!tool) return <HomePage />
  const Component = getToolComponent(toolId, tool.loader)
  return (
    <Suspense fallback={<PageLoading />}>
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
