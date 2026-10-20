import { AnimatePresence, motion } from 'motion/react'
import { SearchIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@/app/navigation'
import { toolRegistry } from '@/core/registry'
import {
  flattenGroupedSearchResults,
  groupSearchResults,
  invalidateSearchIndex,
  searchAll,
  toolsVisibleForQuery,
  type SearchItem,
} from '@/features/search/searchIndex'
import { registerModules } from '@/modules'
import { TOOLBOX_FOCUS_HOME_SEARCH } from '@/features/search/searchFocus'
import { getToolDescription } from '@/i18n/toolLabels'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { SEARCH_SHORTCUT_LABEL } from '@/shared/lib/keyboardShortcut'
import { cn } from '@/shared/utils/cn'

interface GlobalSearchProps {
  compact?: boolean
  onCompactChange?: (compact: boolean) => void
  className?: string
}

const LIMITS = { options: 20, settings: 8, tools: 6 }

export function GlobalSearch({ compact = false, className }: GlobalSearchProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const sections = useMemo(() => {
    const grouped = groupSearchResults(searchAll(query))
    const options = grouped.options.slice(0, LIMITS.options)
    const settings = grouped.settings.slice(0, LIMITS.settings)
    const tools = toolsVisibleForQuery(
      grouped.tools.slice(0, LIMITS.tools),
      options.length,
      query,
    )
    const flat = flattenGroupedSearchResults({ options, settings, tools }, {
      ...LIMITS,
      tools: tools.length,
    })
    return { options, settings, tools, flat }
  }, [query])

  const showResults = open && query.trim().length > 0

  useEffect(() => {
    registerModules()
    invalidateSearchIndex()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      inputRef.current?.focus()
      setOpen(true)
    }
    window.addEventListener(TOOLBOX_FOCUS_HOME_SEARCH, onFocus)
    return () => window.removeEventListener(TOOLBOX_FOCUS_HOME_SEARCH, onFocus)
  }, [])

  const selectItem = useCallback(
    (index: number) => {
      const item = sections.flat[index]
      if (item) {
        setQuery('')
        setOpen(false)
        navigate(item.route)
      }
    },
    [sections.flat, navigate],
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!showResults || sections.flat.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % sections.flat.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i - 1 + sections.flat.length) % sections.flat.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectItem(activeIndex)
    }
  }

  const optionsStart = 0
  const settingsStart = sections.options.length
  const toolsStart = settingsStart + sections.settings.length

  return (
    <div
      className={cn(
        'sticky top-0 z-20 border-b bg-background/90 px-[var(--density-page-pad)] backdrop-blur-md transition-[padding] duration-200',
        compact ? 'py-1.5' : 'py-2.5',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex items-center gap-2 rounded-xl border bg-card shadow-sm transition-[min-height] duration-200',
          compact ? 'min-h-[var(--density-control-h)] px-2.5' : 'min-h-[calc(var(--density-control-h)+0.5rem)] px-3',
        )}
      >
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showResults ? `${listId}-option-${activeIndex}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('home.searchPlaceholder')}
          className="h-auto flex-1 border-0 bg-transparent px-0 text-sm shadow-none hover:border-0 focus-visible:ring-0 placeholder:text-muted-foreground"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('common.clear')}
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : (
          <kbd
            className="shrink-0 rounded border bg-muted px-1.5 font-sans text-[10px] leading-5 font-medium text-muted-foreground"
            aria-label={t('home.searchShortcut', { shortcut: SEARCH_SHORTCUT_LABEL })}
          >
            {SEARCH_SHORTCUT_LABEL}
          </kbd>
        )}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        {t('home.searchShortcutHint', { shortcut: SEARCH_SHORTCUT_LABEL })}
      </p>

      <AnimatePresence>
        {showResults && (
          <motion.div
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-2 max-h-[min(24rem,55vh)] overflow-y-auto rounded-xl border bg-popover p-1 shadow-md"
          >
            {sections.flat.length === 0 ? (
              <p className="px-3 py-4 text-center text-tool-desc">{t('home.noSearchResults')}</p>
            ) : (
              <>
                {sections.options.length > 0 && (
                  <SearchGroup
                    heading={t('palette.options')}
                    items={sections.options}
                    startIndex={optionsStart}
                    listId={listId}
                    activeIndex={activeIndex}
                    onHover={setActiveIndex}
                    onSelect={selectItem}
                  />
                )}
                {sections.settings.length > 0 && (
                  <SearchGroup
                    heading={t('palette.settings')}
                    items={sections.settings}
                    startIndex={settingsStart}
                    listId={listId}
                    activeIndex={activeIndex}
                    onHover={setActiveIndex}
                    onSelect={selectItem}
                  />
                )}
                {sections.tools.length > 0 && (
                  <SearchGroup
                    heading={t('palette.allTools')}
                    items={sections.tools}
                    startIndex={toolsStart}
                    listId={listId}
                    activeIndex={activeIndex}
                    onHover={setActiveIndex}
                    onSelect={selectItem}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SearchGroup({
  heading,
  items,
  startIndex,
  listId,
  activeIndex,
  onHover,
  onSelect,
}: {
  heading: string
  items: SearchItem[]
  startIndex: number
  listId: string
  activeIndex: number
  onHover: (index: number) => void
  onSelect: (index: number) => void
}) {
  return (
    <div className="py-0.5">
      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </p>
      <ul>
        {items.map((item, offset) => {
          const index = startIndex + offset
          return (
            <SearchResultRow
              key={item.id}
              item={item}
              id={`${listId}-option-${index}`}
              active={index === activeIndex}
              onHover={() => onHover(index)}
              onSelect={() => onSelect(index)}
            />
          )
        })}
      </ul>
    </div>
  )
}

function SearchResultRow({
  item,
  id,
  active,
  onHover,
  onSelect,
}: {
  item: SearchItem
  id: string
  active: boolean
  onHover: () => void
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const Icon = item.icon
  const tool = item.toolId ? toolRegistry.get(item.toolId) : undefined
  const subtitle =
    item.kind === 'tool' && tool ? getToolDescription(tool, t) : item.breadcrumb

  const kindLabel =
    item.kind === 'option'
      ? t('home.searchKindOption', { defaultValue: 'Option' })
      : item.kind === 'setting'
        ? t('home.searchKindSetting', { defaultValue: 'Setting' })
        : null

  return (
    <li id={id} role="option" aria-selected={active}>
      <button
        type="button"
        onMouseEnter={onHover}
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors',
          active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-tool-name">{item.title}</span>
            {kindLabel && (
              <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                {kindLabel}
              </span>
            )}
          </span>
          <span className="block truncate text-tool-desc">{subtitle}</span>
        </span>
      </button>
    </li>
  )
}
