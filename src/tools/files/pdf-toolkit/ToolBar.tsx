import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeftIcon, ChevronsUpDownIcon, SearchIcon, ShieldCheckIcon, XIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'
import { CATEGORY_META, TOOL_META } from './toolMeta'
import { CATEGORIES, TOOLS, type ToolId } from './toolList'
import { useToolSearch } from './useToolSearch'

export function ToolIcon({ id, className }: { id: ToolId; className?: string }) {
  const { icon: Icon, tone } = TOOL_META[id]
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', tone, className)} aria-hidden>
      <Icon className="size-[55%]" />
    </span>
  )
}

/** Search field for the catalogue; "/" focuses it from anywhere on the page. */
export function CatalogSearch({ value, onChange, inputRef }: { value: string; onChange: (value: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-1 shadow-xs focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault()
              onChange('')
            }
          }}
          placeholder={t('pdf.ui.searchPlaceholder', { count: TOOLS.length })}
          aria-label={t('pdf.ui.search')}
          className="h-9 border-0 bg-transparent pr-16 pl-9 shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            aria-label={t('pdf.ui.clearSearch')}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground @[480px]:block">/</kbd>
        )}
      </div>
      <span
        className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 @[560px]:inline-flex dark:text-emerald-300"
        title={t('pdf.ui.onDeviceHint')}
      >
        <ShieldCheckIcon className="size-3.5" aria-hidden />
        {t('pdf.ui.onDevice', { count: TOOLS.length })}
      </span>
    </div>
  )
}

function ToolSwitcher({ current, onSelect }: { current: ToolId; onSelect: (id: ToolId) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const matches = useToolSearch(query)
  const list = useRef<HTMLDivElement>(null)
  const grouped = useMemo(
    () => CATEGORIES.map((category) => ({ category, tools: matches.filter((tool) => tool.category === category) })).filter((group) => group.tools.length),
    [matches],
  )

  const choose = (id: ToolId) => {
    setOpen(false)
    setQuery('')
    onSelect(id)
  }

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('button[data-tool]') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" aria-label={t('pdf.ui.switchTool')}>
          <span className="hidden @[560px]:inline">{t('pdf.ui.switchTool')}</span>
          <ChevronsUpDownIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) choose(matches[0].id)
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                list.current?.querySelector<HTMLButtonElement>('button[data-tool]')?.focus()
              }
            }}
            placeholder={t('pdf.ui.search')}
            aria-label={t('pdf.ui.search')}
            className="h-8"
          />
        </div>
        <div ref={list} onKeyDown={onListKey} className="scrollbar-styled max-h-80 overflow-y-auto p-1.5">
          {grouped.map(({ category, tools }) => (
            <div key={category} className="pb-1">
              <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{t(`pdf.cat.${category}`)}</p>
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  data-tool
                  onClick={() => choose(tool.id)}
                  aria-current={tool.id === current ? 'true' : undefined}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
                    tool.id === current && 'bg-primary/[0.08] font-semibold text-primary',
                  )}
                >
                  <ToolIcon id={tool.id} className="size-6 rounded-md" />
                  <span className="truncate">{t(`pdf.tools.${tool.id}.name`)}</span>
                </button>
              ))}
            </div>
          ))}
          {!grouped.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t('pdf.ui.noResults', { query })}</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** The slim bar above an open tool: back to the catalogue, what this tool does, and a quick switcher. */
export function WorkspaceBar({ tool, onBack, onSelect }: { tool: ToolId; onBack: () => void; onSelect: (id: ToolId) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const category = TOOLS.find((entry) => entry.id === tool)?.category ?? 'organize'
  const CategoryIcon = CATEGORY_META[category].icon
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border bg-card p-1.5 shadow-xs">
      <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 gap-1.5 px-2" aria-label={t('pdf.ui.back')}>
        <ArrowLeftIcon aria-hidden />
        <span className="hidden @[640px]:inline">{t('pdf.ui.back')}</span>
      </Button>
      <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
      <motion.div
        key={tool}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <ToolIcon id={tool} className="size-8" />
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-sm leading-tight font-semibold">{t(`pdf.tools.${tool}.name`)}</h2>
          <p className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
            <CategoryIcon className="size-3 shrink-0" aria-hidden />
            <span className="shrink-0">{t(`pdf.cat.${category}`)}</span>
            <span aria-hidden className="hidden @[560px]:inline">·</span>
            <span className="hidden truncate @[560px]:inline">{t(`pdf.tools.${tool}.desc`)}</span>
          </p>
        </div>
      </motion.div>
      <ToolSwitcher current={tool} onSelect={onSelect} />
    </div>
  )
}
