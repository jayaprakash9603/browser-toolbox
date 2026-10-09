import { AnimatePresence, motion } from 'motion/react'
import { SearchIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toolRegistry } from '@/core/registry'
import { filterTools } from '@/features/search/filterTools'
import { TOOLBOX_FOCUS_HOME_SEARCH } from '@/features/search/searchFocus'
import { Link } from '@/app/router'
import { Button } from '@/shared/components/ui/button'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { useRecentTools } from '@/shared/hooks/useRecentTools'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { SEARCH_SHORTCUT_LABEL } from '@/shared/lib/keyboardShortcut'
import { cn } from '@/shared/utils/cn'

interface GlobalSearchProps {
  compact?: boolean
  onCompactChange?: (compact: boolean) => void
  className?: string
}

export function GlobalSearch({ compact = false, className }: GlobalSearchProps) {
  const { t } = useTranslation()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const { favorites } = useFavorites()
  const { recent } = useRecentTools()

  const tools = toolRegistry.getAll()
  const { results } = useMemo(
    () => filterTools(tools, query, favorites, recent.map((r) => r.toolId)),
    [tools, query, favorites, recent],
  )

  const showResults = open && query.trim().length > 0

  useEffect(() => {
    const onFocus = () => {
      inputRef.current?.focus()
      setOpen(true)
    }
    window.addEventListener(TOOLBOX_FOCUS_HOME_SEARCH, onFocus)
    return () => window.removeEventListener(TOOLBOX_FOCUS_HOME_SEARCH, onFocus)
  }, [])

  const selectTool = useCallback(
    (index: number) => {
      const tool = results[index]
      if (tool) window.location.hash = tool.route
    },
    [results],
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!showResults || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectTool(activeIndex)
    }
  }

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
        <input
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
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-2 max-h-56 overflow-y-auto rounded-xl border bg-popover p-1 shadow-md"
          >
            {results.length === 0 ? (
              <li className="px-3 py-4 text-center text-tool-desc">{t('home.noSearchResults')}</li>
            ) : (
              results.slice(0, 12).map((tool, index) => (
                <SearchResultRow
                  key={tool.id}
                  tool={tool}
                  id={`${listId}-option-${index}`}
                  active={index === activeIndex}
                  onHover={() => setActiveIndex(index)}
                />
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function SearchResultRow({
  tool,
  id,
  active,
  onHover,
}: {
  tool: ReturnType<typeof toolRegistry.getAll>[number]
  id: string
  active: boolean
  onHover: () => void
}) {
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  return (
    <li id={id} role="option" aria-selected={active}>
      <Link
        to={tool.route}
        onMouseEnter={onHover}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none transition-colors',
          active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-tool-name">{name}</span>
          <span className="block truncate text-tool-desc">{description}</span>
        </span>
      </Link>
    </li>
  )
}
