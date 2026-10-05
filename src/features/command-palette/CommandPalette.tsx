import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import { useNavigate } from '@/app/navigation'

import { toolRegistry } from '@/core/registry'
import { useFavorites } from '@/shared/hooks/useFavorites'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { favorites } = useFavorites()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const tools = toolRegistry.getAll()
  const favoriteTools = tools.filter((tool) => favorites.includes(tool.id))

  const select = (route: string) => {
    onOpenChange(false)
    navigate(route)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-lg border bg-popover shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <Command label="Command palette" shouldFilter>
          <div className="border-b px-3">
            <Command.Input
              ref={inputRef}
              placeholder="Search tools…"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              No tools found.
            </Command.Empty>
            {favoriteTools.length > 0 && (
              <Command.Group
                heading="Favorites"
                className="text-[10px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
              >
                {favoriteTools.map((tool) => (
                  <CommandItem key={tool.id} tool={tool} onSelect={select} />
                ))}
              </Command.Group>
            )}
            <Command.Group
              heading="All tools"
              className="text-[10px] font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              {tools.map((tool) => (
                <CommandItem key={tool.id} tool={tool} onSelect={select} />
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
  onSelect,
}: {
  tool: ReturnType<typeof toolRegistry.getAll>[number]
  onSelect: (route: string) => void
}) {
  const Icon = tool.icon
  return (
    <Command.Item
      value={`${tool.name} ${tool.keywords.join(' ')} ${tool.category}`}
      onSelect={() => onSelect(tool.route)}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none data-[selected=true]:bg-accent"
    >
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">{tool.name}</span>
      <span className="text-[10px] text-muted-foreground">{tool.category}</span>
    </Command.Item>
  )
}
