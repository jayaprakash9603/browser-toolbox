import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchIcon, SettingsIcon } from 'lucide-react'

import { Link, useRouter } from '@/app/router'
import { getToolComponent } from '@/app/toolComponents'
import { toolRegistry } from '@/core/registry'
import { trackRecentTool } from '@/features/recent-tools/recentToolsService'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { requestFocusHomeSearch } from '@/features/search/searchFocus'
import {
  AppLoadingSkeleton,
  type AppLoadingSkeletonVariant,
} from '@/shared/components/AppLoadingSkeleton'
import { BrandLogo } from '@/shared/components/BrandLogo'
import { Button } from '@/shared/components/ui/button'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { SEARCH_SHORTCUT_LABEL } from '@/shared/lib/keyboardShortcut'
const HomePage = lazy(() => import('@/app/pages/HomePage'))
const SettingsPage = lazy(() => import('@/app/pages/SettingsPage'))
const CategoryPage = lazy(() => import('@/app/pages/CategoryPage'))
const DevToolsPage = lazy(() => import('@/app/pages/DevToolsPage'))

const LEGACY_TOOL_ROUTES: Record<string, string> = {
  '/tools/clipboard/history': 'clipboard.manager',
  '/tools/clipboard/pinned': 'clipboard.manager',
  '/tools/clipboard/search': 'clipboard.manager',
  '/tools/text/markdown-formatter': 'text.formatter',
  '/tools/text/html-formatter': 'text.formatter',
  '/tools/text/css-formatter': 'text.formatter',
  '/tools/text/javascript-formatter': 'text.formatter',
  '/tools/text/word-counter': 'text.analyzer',
  '/tools/text/line-counter': 'text.analyzer',
  '/tools/text/duplicate-line-remover': 'text.line-tools',
  '/tools/text/sort-lines': 'text.line-tools',
  '/tools/text/lorem-ipsum': 'text.dummy-data',
  '/tools/qa/api-request-builder': 'api.request-builder',
  '/tools/developer/timestamp-toolkit': 'datetime.toolkit',
}

function isHomePath(path: string) {
  return path === '/' || path === ''
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const { path } = useRouter()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (isHomePath(path)) requestFocusHomeSearch()
        else setPaletteOpen((open) => !open)
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [path])

  const tool = useMemo(() => toolRegistry.getAll().find((entry) => entry.route === path), [path])

  useEffect(() => {
    if (tool) void trackRecentTool(tool.id)
  }, [tool])

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [path])

  const content = renderRoute(path)

  return (
    <div className="flex h-full flex-col overflow-x-clip bg-background">
      <header
        className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md"
      >
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 rounded-md pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo size={30} />
          <span className="truncate text-sm font-semibold tracking-tight">{t('home.title')}</span>
        </Link>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-[var(--density-control-h)] gap-1.5 px-2 font-normal text-muted-foreground"
              aria-label={isHomePath(path) ? t('nav.focusSearch') : t('nav.openCommandPalette')}
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => {
                if (isHomePath(path)) requestFocusHomeSearch()
                else setPaletteOpen(true)
              }}
            >
              <SearchIcon className="size-4" />
              <kbd className="rounded border bg-muted px-1.5 font-sans text-[10px] leading-5 font-medium">
                {SEARCH_SHORTCUT_LABEL}
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isHomePath(path) ? t('nav.focusSearch') : t('nav.commandPalette')}
          </TooltipContent>
        </Tooltip>
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

      <main
        ref={mainRef}
        tabIndex={-1}
        className="@container min-h-0 min-w-0 flex-1 overflow-hidden outline-none"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={path}
            className="h-full"
            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Suspense
              fallback={
                <AppLoadingSkeleton variant={getLoadingVariant(path)} label={t('nav.loading')} />
              }
            >
              {content}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

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
  if (path === '/devtools') return <DevToolsPage />
  const legacyToolId = LEGACY_TOOL_ROUTES[path]
  if (legacyToolId) return <ToolHost toolId={legacyToolId} />
  const categoryMatch = path.match(/^\/categories\/([\w-]+)$/)
  if (categoryMatch) return <CategoryPage categoryId={categoryMatch[1]} />
  const tool = toolRegistry.getAll().find((entry) => entry.route === path)
  if (tool) return <ToolHost toolId={tool.id} />
  return <HomePage />
}

function getLoadingVariant(path: string): AppLoadingSkeletonVariant {
  if (path === '/settings') return 'settings'
  if (path === '/favorites' || path === '/recent') return 'collection'
  if (path === '/devtools') return 'category'
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
