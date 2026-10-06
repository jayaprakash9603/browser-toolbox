import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import { BracesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@/app/navigation'

import { toolRegistry } from '@/core/registry'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { TEXT_FORMAT_IDS, type TextFormatId } from '@/tools/text/text-formatter/formatters/types'
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

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const tools = toolRegistry.getAll()
  const favoriteTools = tools.filter((tool) => favorites.includes(tool.id))

  const select = (route: string) => {
    setQuery('')
    onOpenChange(false)
    navigate(route)
  }

  const close = () => {
    setQuery('')
    onOpenChange(false)
  }

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
        <Command label={t('nav.commandPalette')} shouldFilter>
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
            {favoriteTools.length > 0 && (
              <Command.Group
                heading={t('palette.favorites')}
                className="text-[10px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
              >
                {favoriteTools.map((tool) => (
                  <CommandItem key={tool.id} tool={tool} query={query} onSelect={select} />
                ))}
              </Command.Group>
            )}
            <Command.Group
              heading={t('palette.formatters')}
              className="text-[10px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              {TEXT_FORMAT_IDS.map((format) => (
                <FormatterCommandItem
                  key={format}
                  format={format}
                  query={query}
                  onSelect={(selectedFormat) => {
                    const route = toolRegistry.get('text.formatter')?.route
                    if (route) select(`${route}?format=${selectedFormat}`)
                  }}
                />
              ))}
            </Command.Group>
            <Command.Group
              heading={t('palette.allTools')}
              className="text-[10px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              {tools.map((tool) => (
                <CommandItem key={tool.id} tool={tool} query={query} onSelect={select} />
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>,
    document.body,
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
  const name = t(`tools.${tool.id}.name`, { defaultValue: tool.name })
  const category = t(`categories.${tool.category}.name`, { defaultValue: tool.category })
  return (
    <Command.Item
      value={`${name} ${tool.keywords.join(' ')} ${category}`}
      onSelect={() => onSelect(tool.route)}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none data-[selected=true]:bg-accent"
    >
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="flex-1 truncate"><HighlightedText text={name} query={query} /></span>
      <span className="text-[10px] text-muted-foreground"><HighlightedText text={category} query={query} /></span>
    </Command.Item>
  )
}

function FormatterCommandItem({
  format,
  query,
  onSelect,
}: {
  format: TextFormatId
  query: string
  onSelect: (format: TextFormatId) => void
}) {
  const { t } = useTranslation()
  const label = t(`text.format.${format}`)
  const name = t('text.formatter.optionName', { format: label })
  const category = t('categories.text.name')

  return (
    <Command.Item
      value={`${name} ${format} formatter ${category}`}
      onSelect={() => onSelect(format)}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none data-[selected=true]:bg-accent"
    >
      <BracesIcon className="size-3.5 text-muted-foreground" />
      <span className="flex-1 truncate"><HighlightedText text={name} query={query} /></span>
      <span className="text-[10px] text-muted-foreground">
        <HighlightedText text={category} query={query} />
      </span>
    </Command.Item>
  )
}
