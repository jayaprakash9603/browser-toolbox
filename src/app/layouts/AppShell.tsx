import { motion, useReducedMotion } from 'motion/react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchIcon, SettingsIcon } from 'lucide-react'

import { LEGACY_TOOL_ROUTES } from '@/app/legacyToolRoutes'
import { Link, useRouter } from '@/app/router'
import { isCaptureViewerSearch } from '@/core/screenshot/viewerUrl'
import { getToolComponent } from '@/app/toolComponents'
import { toolRegistry } from '@/core/registry'
import { trackRecentTool } from '@/features/recent-tools/recentToolsService'
import { NetStatusIndicator } from '@/features/netmon/components/NetStatusIndicator'
import {
  AppLoadingSkeleton,
  type AppLoadingSkeletonVariant,
} from '@/shared/components/AppLoadingSkeleton'
import { BrandLogo } from '@/shared/components/BrandLogo'
import { Button } from '@/shared/components/ui/button'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { usePanelShortcuts } from '@/features/shortcuts/usePanelShortcuts'
import { useShortcutDisplay } from '@/features/shortcuts/useShortcutDisplay'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

const HomePage = lazy(() => import('@/app/pages/HomePage'))
const SettingsPage = lazy(() => import('@/app/pages/SettingsPage'))
const KeyboardShortcutsPage = lazy(() => import('@/app/pages/settings/KeyboardShortcutsPage'))
const CategoryPage = lazy(() => import('@/app/pages/CategoryPage'))
const DevToolsPage = lazy(() => import('@/app/pages/DevToolsPage'))
const DevToolsInterceptorPage = lazy(() => import('@/app/pages/DevToolsInterceptorPage'))
const CommandPalette = lazy(() =>
  import('@/features/command-palette/CommandPalette').then((m) => ({ default: m.CommandPalette })),
)

function isHomePath(path: string) {
  return path === '/' || path === ''
}

function scheduleIdle(callback: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 3000 })
  } else {
    window.setTimeout(callback, 1500)
  }
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const { path, search } = useRouter()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteMounted, setPaletteMounted] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const { resolvePanelCommand, forwardGlobalShortcut } = usePanelShortcuts()
  const searchShortcutLabel = useShortcutDisplay('panel-search')

  useEffect(() => {
    scheduleIdle(() => {
      void import('@/features/command-palette/CommandPalette')
      void import('@/features/search/searchIndex').then((m) => m.warmSearchIndex())
    })
  }, [])

  const openPalette = () => {
    setPaletteMounted(true)
    setPaletteOpen(true)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const panelCommand = resolvePanelCommand(event)
      if (panelCommand === 'panel-search') {
        event.preventDefault()
        openPalette()
      } else if (!panelCommand && forwardGlobalShortcut(event)) {
        event.preventDefault()
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resolvePanelCommand, forwardGlobalShortcut])

  const tool = useMemo(() => toolRegistry.getAll().find((entry) => entry.route === path), [path])

  useEffect(() => {
    if (tool) void trackRecentTool(tool.id)
  }, [tool])

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [path])

  const content = renderRoute(path)
  // The DevTools Interceptor panel is a standalone network tool: no toolbox navigation chrome.
  const captureFullPage =
    path === '/tools/screenshots/capture' && isCaptureViewerSearch(search)
  const chromeless = path === '/devtools/interceptor' || captureFullPage

  return (
    <div className="flex h-full flex-col overflow-x-clip bg-background">
      {!chromeless && (
        <header className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-1.5 border-b bg-background/85 px-2.5 backdrop-blur-md @[360px]:gap-2 @[360px]:px-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 rounded-md pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo size={26} />
            <span className="truncate text-[13px] font-semibold tracking-tight">
              {t('home.title')}
            </span>
          </Link>
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-[var(--density-control-h)] gap-1.5 px-2 font-normal text-muted-foreground"
                aria-label={t('nav.openCommandPalette')}
                aria-keyshortcuts="Control+K Meta+K"
                onClick={openPalette}
              >
                <SearchIcon className="size-4" />
                <kbd className="rounded border bg-muted px-1.5 font-sans text-[10px] leading-5 font-medium">
                  {searchShortcutLabel}
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('nav.commandPalette')}</TooltipContent>
          </Tooltip>
          {isHomePath(path) && <NetStatusIndicator />}
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" aria-label={t('nav.settings')}>
                <Link to="/settings">
                  <SettingsIcon className="size-[18px]" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('nav.settings')}</TooltipContent>
          </Tooltip>
        </header>
      )}

      <main
        ref={mainRef}
        tabIndex={-1}
        className="@container min-h-0 min-w-0 flex-1 overflow-hidden outline-none"
      >
        <motion.div
          key={path}
          className="h-full"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.15, ease: 'easeOut' }}
        >
          <ErrorBoundary resetKey={path} showHomeLink>
            <Suspense
              fallback={
                <AppLoadingSkeleton variant={getLoadingVariant(path)} label={t('nav.loading')} />
              }
            >
              {content}
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </main>

      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </Suspense>
      )}
      {children}
    </div>
  )
}

function renderRoute(path: string) {
  if (path === '/' || path === '') return <HomePage />
  if (path === '/settings') return <SettingsPage />
  if (path === '/settings/keyboard-shortcuts') return <KeyboardShortcutsPage />
  if (path === '/favorites') return <HomePage section="favorites" />
  if (path === '/recent') return <HomePage section="recent" />
  if (path === '/devtools') return <DevToolsPage />
  if (path === '/devtools/interceptor') return <DevToolsInterceptorPage />
  const legacyToolId = LEGACY_TOOL_ROUTES[path]
  if (legacyToolId) return <ToolHost toolId={legacyToolId} />
  const categoryMatch = path.match(/^\/categories\/([\w-]+)$/)
  if (categoryMatch) return <CategoryPage categoryId={categoryMatch[1]} />
  const tool = toolRegistry.getAll().find((entry) => entry.route === path)
  if (tool) return <ToolHost toolId={tool.id} />
  return <HomePage />
}

function getLoadingVariant(path: string): AppLoadingSkeletonVariant {
  if (path === '/settings' || path === '/settings/keyboard-shortcuts') return 'settings'
  if (path === '/favorites' || path === '/recent') return 'collection'
  if (path === '/devtools' || path === '/devtools/interceptor') return 'category'
  if (path in LEGACY_TOOL_ROUTES) return 'tool'
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
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Component />
    </Suspense>
  )
}
