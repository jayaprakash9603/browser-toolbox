import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
} from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerDownLeftIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import { useNavigate } from '@/app/navigation'

import { toolRegistry } from '@/core/registry'
import { getToolDescription, getToolName } from '@/i18n/toolLabels'
import { searchAll, toolsVisibleForQuery, type SearchItem } from '@/features/search/searchIndex'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { useRecentTools } from '@/shared/hooks/useRecentTools'
import { cn } from '@/shared/utils/cn'
import { HighlightedText } from './HighlightedText'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tool = ReturnType<typeof toolRegistry.getAll>[number]

const MAX_RECENT = 4
const MAX_OPTION_RESULTS = 60
const MAX_SETTING_RESULTS = 10
const SUGGESTIONS = ['json', 'color', 'timer', 'screenshot', 'regex']
const GROUP_CLASS =
  '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase first:[&_[cmdk-group-heading]]:pt-1'

const PANEL_SPRING: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }
const HIGHLIGHT_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { favorites } = useFavorites()
  const { recent, refresh } = useRecentTools()
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')

  const tools = useMemo(
    () =>
      toolRegistry
        .getAll()
        .filter((tool) => (tool.status ?? 'active') !== 'disabled'),
    [],
  )
  const favoriteTools = useMemo(
    () => tools.filter((tool) => favorites.includes(tool.id)),
    [tools, favorites],
  )
  const recentTools = useMemo(
    () =>
      recent
        .map((entry) => tools.find((tool) => tool.id === entry.toolId))
        .filter((tool): tool is Tool => Boolean(tool))
        .slice(0, MAX_RECENT),
    [recent, tools],
  )
  const defaultTools = useMemo(
    () => tools.filter((tool) => tool.capabilities.includes('COMMAND')),
    [tools],
  )

  // Results and highlights must read `deferredQuery`, never `query`, or every keystroke re-renders the list.
  const deferredQuery = useDeferredValue(query)
  const trimmed = deferredQuery.trim()
  const results = useMemo(() => {
    const searchResults = trimmed ? searchAll(trimmed) : []
    const options = searchResults.filter((item) => item.kind === 'option')
    const settings = searchResults.filter((item) => item.kind === 'setting')
    const toolMatches = toolsVisibleForQuery(
      searchResults.filter((item) => item.kind === 'tool'),
      options.length,
      trimmed,
    )
    return {
      tools: toolMatches,
      options: options.slice(0, MAX_OPTION_RESULTS),
      settings: settings.slice(0, MAX_SETTING_RESULTS),
      total: toolMatches.length + options.length + settings.length,
    }
  }, [trimmed])
  const { tools: toolItems, options: optionItems, settings: settingItems, total: resultCount } = results
  const searching = trimmed.length > 0

  useEffect(() => {
    if (!open) return
    if (document.activeElement instanceof HTMLElement && !returnFocusRef.current) {
      returnFocusRef.current = document.activeElement
    }
    inputRef.current?.focus()
    void Promise.resolve().then(refresh)
  }, [open, refresh])

  const close = () => onOpenChange(false)

  const select = useCallback(
    (route: string) => {
      returnFocusRef.current = null
      onOpenChange(false)
      navigate(route)
    },
    [navigate, onOpenChange],
  )

  const afterClose = () => {
    setQuery('')
    setSelected('')
    returnFocusRef.current?.focus({ preventScroll: true })
    returnFocusRef.current = null
  }

  const panelMotion: Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        initial: { opacity: 0, y: -18, scale: 0.95, filter: 'blur(8px)' },
        animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: PANEL_SPRING },
        exit: {
          opacity: 0,
          y: -8,
          scale: 0.98,
          filter: 'blur(4px)',
          transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
        },
      }

  return createPortal(
    <AnimatePresence onExitComplete={afterClose}>
      {open && (
        <motion.div
          key="palette"
          className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[min(12vh,96px)]"
          onClick={close}
          role="presentation"
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
          />
          <motion.div
            {...panelMotion}
            style={{ transformOrigin: 'top center' }}
            className="relative w-full max-w-md rounded-2xl bg-border p-px shadow-[0_24px_64px_-16px_rgb(0_0_0/0.5)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.commandPalette')}
          >
            {!reduce && (
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <motion.div
                  className="absolute top-1/2 left-1/2 aspect-square w-[160%]"
                  style={{
                    x: '-50%',
                    y: '-50%',
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, var(--primary) 50deg, color-mix(in srgb, var(--primary) 35%, transparent) 110deg, transparent 170deg)',
                  }}
                  initial={{ rotate: -40, opacity: 0 }}
                  animate={{ rotate: 320, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.3, ease: [0.3, 0.6, 0.3, 1], times: [0, 0.15, 0.7, 1] }}
                />
              </div>
            )}
            <div className="relative overflow-hidden rounded-[15px] bg-popover text-popover-foreground">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent"
              />
              <Command
                label={t('nav.commandPalette')}
                shouldFilter={false}
                value={selected}
                onValueChange={setSelected}
                loop
              >
                <div className="relative flex items-center gap-2.5 border-b px-3.5">
                  <motion.span
                    animate={reduce ? undefined : { scale: searching ? 1.08 : 1 }}
                    transition={HIGHLIGHT_SPRING}
                    className={cn(
                      'flex shrink-0 transition-colors duration-200',
                      searching ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    <SearchIcon className="size-[18px]" aria-hidden />
                  </motion.span>
                  <Command.Input
                    ref={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    placeholder={t('nav.searchTools')}
                    className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                  />
                  <AnimatePresence initial={false}>
                    {query && (
                      <motion.button
                        type="button"
                        key="clear"
                        initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.1 } }}
                        onClick={() => {
                          setQuery('')
                          inputRef.current?.focus()
                        }}
                        aria-label={t('palette.clear')}
                        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <XIcon className="size-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t('palette.close')}
                    className="shrink-0 cursor-pointer rounded-md border bg-muted px-1.5 font-sans text-[11px] leading-5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Esc
                  </button>
                </div>

                <Command.List className="scrollbar-styled h-[min(var(--cmdk-list-height),min(58vh,26rem))] scroll-py-2 overflow-y-auto overscroll-contain p-2 transition-[height] duration-200 ease-out motion-reduce:transition-none">
                  <Command.Empty>
                    <EmptyResults
                      query={trimmed}
                      reduce={!!reduce}
                      onSuggest={(value) => {
                        setQuery(value)
                        inputRef.current?.focus()
                      }}
                    />
                  </Command.Empty>
                  <PaletteResults
                    query={trimmed}
                    selected={selected}
                    reduce={!!reduce}
                    toolItems={toolItems}
                    optionItems={optionItems}
                    settingItems={settingItems}
                    recentTools={recentTools}
                    favoriteTools={favoriteTools}
                    defaultTools={defaultTools}
                    onSelect={select}
                  />
                </Command.List>

                <div className="flex items-center gap-3 border-t bg-muted/30 px-3.5 py-2 text-[11px] text-muted-foreground">
                  <KeyHint keys={['↑', '↓']} label={t('palette.navigate')} />
                  <KeyHint keys={['↵']} label={t('palette.open')} />
                  <KeyHint keys={['Esc']} label={t('palette.closeShort')} className="max-[340px]:hidden" />
                  <span role="status" aria-live="polite" aria-atomic="true" className="ml-auto tabular-nums">
                    {searching ? t('palette.results', { count: resultCount }) : ''}
                  </span>
                </div>
              </Command>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface PaletteResultsProps {
  query: string
  selected: string
  reduce: boolean
  toolItems: SearchItem[]
  optionItems: SearchItem[]
  settingItems: SearchItem[]
  recentTools: Tool[]
  favoriteTools: Tool[]
  defaultTools: Tool[]
  onSelect: (route: string) => void
}

const PaletteResults = memo(function PaletteResults({
  query,
  selected,
  reduce,
  toolItems,
  optionItems,
  settingItems,
  recentTools,
  favoriteTools,
  defaultTools,
  onSelect,
}: PaletteResultsProps) {
  const { t } = useTranslation()
  const searching = query.length > 0
  let itemIndex = 0
  const nextIndex = () => itemIndex++

  const renderTool = (tool: Tool, group: string) => {
    const name = getToolName(tool, t)
    const category = t(`categories.${tool.category}.name`, { defaultValue: tool.category })
    const value = `${group}:${tool.id} ${name} ${category}`
    return (
      <PaletteItem
        key={`${group}-${tool.id}`}
        value={value}
        active={selected === value}
        icon={tool.icon}
        title={name}
        meta={category}
        index={nextIndex()}
        stagger
        reduce={reduce}
        onSelect={() => onSelect(tool.route)}
      />
    )
  }

  const renderSearchGroup = (heading: string, items: SearchItem[]) =>
    items.length > 0 && (
      <Command.Group heading={heading} className={GROUP_CLASS}>
        {items.map((item) => {
          const value = `${item.title} ${item.breadcrumb} ${item.id}`
          const toolDef = item.toolId ? toolRegistry.get(item.toolId) : undefined
          const toolDesc = toolDef ? getToolDescription(toolDef, t) : ''
          return (
            <PaletteItem
              key={item.id}
              value={value}
              active={selected === value}
              icon={item.icon}
              title={<HighlightedText text={item.title} query={query} />}
              subtitle={
                item.kind === 'tool' ? (
                  <HighlightedText text={toolDesc} query={query} />
                ) : (
                  <HighlightedText text={item.breadcrumb} query={query} />
                )
              }
              meta={
                item.kind === 'tool' ? (
                  <HighlightedText text={item.breadcrumb} query={query} />
                ) : undefined
              }
              index={nextIndex()}
              stagger={false}
              reduce={reduce}
              onSelect={() => onSelect(item.route)}
            />
          )
        })}
      </Command.Group>
    )

  if (searching) {
    return (
      <>
        {renderSearchGroup(t('palette.allTools'), toolItems)}
        {renderSearchGroup(t('palette.options', { defaultValue: 'Options' }), optionItems)}
        {renderSearchGroup(t('palette.settings', { defaultValue: 'Settings' }), settingItems)}
      </>
    )
  }

  return (
    <>
      {recentTools.length > 0 && (
        <Command.Group heading={t('palette.recent')} className={GROUP_CLASS}>
          {recentTools.map((tool) => renderTool(tool, 'recent'))}
        </Command.Group>
      )}
      {favoriteTools.length > 0 && (
        <Command.Group heading={t('palette.favorites')} className={GROUP_CLASS}>
          {favoriteTools.map((tool) => renderTool(tool, 'favorite'))}
        </Command.Group>
      )}
      <Command.Group heading={t('palette.allTools')} className={GROUP_CLASS}>
        {defaultTools.map((tool) => renderTool(tool, 'all'))}
      </Command.Group>
    </>
  )
})

function PaletteItem({
  value,
  active,
  icon: Icon,
  title,
  subtitle,
  meta,
  index,
  stagger,
  reduce,
  onSelect,
}: {
  value: string
  active: boolean
  icon: ComponentType<{ className?: string }>
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  index: number
  stagger: boolean
  reduce: boolean
  onSelect: () => void
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] outline-none select-none"
    >
      {active &&
        (reduce ? (
          <div className="absolute inset-0 rounded-lg bg-accent ring-1 ring-primary/25" />
        ) : (
          <motion.div
            layoutId="palette-active-item"
            transition={HIGHLIGHT_SPRING}
            className="absolute inset-0 rounded-lg bg-accent ring-1 ring-primary/25"
          />
        ))}
      <motion.span
        className="relative flex min-w-0 flex-1 items-center gap-3"
        initial={reduce || !stagger || index > 12 ? false : { opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: 0.06 + index * 0.018 }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-[color,background-color,border-color,transform] duration-200 group-data-[selected=true]:scale-105 group-data-[selected=true]:border-primary/30 group-data-[selected=true]:bg-primary/10 group-data-[selected=true]:text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        {meta && (
          <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground group-data-[selected=true]:hidden">
            {meta}
          </span>
        )}
        <span
          aria-hidden
          className="hidden size-6 shrink-0 items-center justify-center rounded-md border bg-background text-primary group-data-[selected=true]:flex"
        >
          <CornerDownLeftIcon className="size-3.5" />
        </span>
      </motion.span>
    </Command.Item>
  )
}

function EmptyResults({
  query,
  reduce,
  onSuggest,
}: {
  query: string
  reduce: boolean
  onSuggest: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col items-center gap-2 px-4 py-7 text-center"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchXIcon className="size-5" aria-hidden />
      </span>
      <p className="text-[13px] font-medium">{t('palette.noResultsFor', { query })}</p>
      <p className="text-xs text-muted-foreground">{t('palette.noResultsHint')}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-1.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggest(suggestion)}
            className="h-7 cursor-pointer rounded-full border px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function KeyHint({ keys, label, className }: { keys: string[]; label: string; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {keys.map((key) => (
        <kbd
          key={key}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border bg-background px-1 font-sans text-[10px] font-medium"
        >
          {key}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  )
}
