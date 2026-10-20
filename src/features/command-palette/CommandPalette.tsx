import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@/app/navigation'

import { toolRegistry } from '@/core/registry'
import { getToolName } from '@/i18n/toolLabels'
import { searchAll, toolsVisibleForQuery, type SearchItem } from '@/features/search/searchIndex'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { HighlightedText } from './HighlightedText'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { favorites } = useFavorites()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

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
  const defaultTools = useMemo(
    () => tools.filter((tool) => tool.capabilities.includes('COMMAND')),
    [tools],
  )

  const trimmed = query.trim()
  const searchResults = trimmed ? searchAll(trimmed) : []
  const optionItems = searchResults.filter((item) => item.kind === 'option')
  const settingItems = searchResults.filter((item) => item.kind === 'setting')
  const toolItems = toolsVisibleForQuery(
    searchResults.filter((item) => item.kind === 'tool'),
    optionItems.length,
    trimmed,
  )

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const select = (route: string) => {
    setQuery('')
    onOpenChange(false)
    navigate(route)
  }

  const close = () => {
    setQuery('')
    onOpenChange(false)
  }

  const searching = trimmed.length > 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-lg border bg-popover shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('nav.commandPalette')}
      >
        <Command label={t('nav.commandPalette')} shouldFilter={false}>
          <div className="border-b px-3">
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={t('nav.searchTools')}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              {t('palette.noToolsFound')}
            </Command.Empty>
            {searching ? (
              <>
                {toolItems.length > 0 && (
                  <SearchItemGroup
                    heading={t('palette.allTools')}
                    items={toolItems}
                    query={query}
                    onSelect={select}
                  />
                )}
                {optionItems.length > 0 && (
                  <SearchItemGroup
                    heading={t('palette.options', { defaultValue: 'Options' })}
                    items={optionItems}
                    query={query}
                    onSelect={select}
                  />
                )}
                {settingItems.length > 0 && (
                  <SearchItemGroup
                    heading={t('palette.settings', { defaultValue: 'Settings' })}
                    items={settingItems}
                    query={query}
                    onSelect={select}
                  />
                )}
              </>
            ) : (
              <>
                {favoriteTools.length > 0 && (
                  <Command.Group
                    heading={t('palette.favorites')}
                    className="text-[11px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                  >
                    {favoriteTools.map((tool) => (
                      <CommandItem key={tool.id} tool={tool} query={query} onSelect={select} />
                    ))}
                  </Command.Group>
                )}
                <Command.Group
                  heading={t('palette.allTools')}
                  className="text-[11px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {defaultTools.map((tool) => (
                    <CommandItem key={tool.id} tool={tool} query={query} onSelect={select} />
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>,
    document.body,
  )
}

function SearchItemGroup({
  heading,
  items,
  query,
  onSelect,
}: {
  heading: string
  items: SearchItem[]
  query: string
  onSelect: (route: string) => void
}) {
  return (
    <Command.Group
      heading={heading}
      className="text-[11px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
    >
      {items.map((item) => (
        <Command.Item
          key={item.id}
          value={`${item.title} ${item.breadcrumb} ${item.id}`}
          onSelect={() => onSelect(item.route)}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none data-[selected=true]:bg-accent"
        >
          <item.icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            <HighlightedText text={item.title} query={query} />
            {item.kind !== 'tool' && (
              <span className="block truncate text-[10px] text-muted-foreground">
                <HighlightedText text={item.breadcrumb} query={query} />
              </span>
            )}
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  )
}

function CommandItem({
  tool,
  query,
  onSelect,
}: {
  tool: ReturnType<typeof toolRegistry.getAll>[number]
  query: string
  onSelect: (route: string) => void
}) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const name = getToolName(tool, t)
  const category = t(`categories.${tool.category}.name`, { defaultValue: tool.category })
  return (
    <Command.Item
      value={`${name} ${tool.keywords.join(' ')} ${category}`}
      onSelect={() => onSelect(tool.route)}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none data-[selected=true]:bg-accent"
    >
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="flex-1 truncate"><HighlightedText text={name} query={query} /></span>
      <span className="text-[11px] text-muted-foreground"><HighlightedText text={category} query={query} /></span>
    </Command.Item>
  )
}
