import { useState, type ReactNode } from 'react'
import type { AnnotationTool } from '@/core/engines/capture'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  DropletsIcon,
  HighlighterIcon,
  ListOrderedIcon,
  Redo2Icon,
  SquareIcon,
  TypeIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  type LucideIcon,
} from 'lucide-react'

const TOOLS: { id: AnnotationTool; label: string; icon: LucideIcon }[] = [
  { id: 'rect', label: 'Rectangle', icon: SquareIcon },
  { id: 'circle', label: 'Ellipse', icon: CircleIcon },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRightIcon },
  { id: 'highlight', label: 'Highlight', icon: HighlighterIcon },
  { id: 'blur', label: 'Blur', icon: DropletsIcon },
  { id: 'marker', label: 'Numbered step', icon: ListOrderedIcon },
  { id: 'text', label: 'Text', icon: TypeIcon },
]

const ANNOTATION_SWATCHES = [
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#0f172a', name: 'Black' },
] as const

function isLightHex(hex: string): boolean {
  const value = hex.replace('#', '')
  if (value.length < 6) return false
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function swatchName(hex: string): string {
  const match = ANNOTATION_SWATCHES.find((swatch) => swatch.hex.toLowerCase() === hex.toLowerCase())
  return match?.name ?? 'Custom'
}

type ZoomLevel = 'fit' | number

export type CaptureEditorToolbarProps = {
  activeTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  color: string
  onColorChange: (color: string) => void
  text: string
  onTextChange: (text: string) => void
  effectiveZoom: number
  zoom: ZoomLevel
  zoomPercent: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onZoom100: () => void
  onUndo: () => void
  onRedo: () => void
  minZoom: number
  maxZoom: number
}

function ToolDivider() {
  return <div className="hidden h-6 w-px shrink-0 bg-border/70 @[48rem]:block" aria-hidden />
}

function ToolbarCluster({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-1.5 py-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

function ColorDropdown({ color, onColorChange }: { color: string; onColorChange: (color: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = swatchName(color)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Color, ${current}`}
          aria-haspopup="listbox"
          className="h-8 shrink-0 gap-2 px-2 font-medium"
        >
          <span
            className="size-4 shrink-0 rounded-sm border border-border/80 shadow-xs"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className="max-w-[4.5rem] truncate text-xs">{current}</span>
          <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-none min-w-[13.5rem] overflow-visible p-2" sideOffset={6}>
        <DropdownMenuLabel className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide">
          Standard colors
        </DropdownMenuLabel>
        <div role="listbox" aria-label="Standard colors" className="grid grid-cols-4 gap-2 p-1">
          {ANNOTATION_SWATCHES.map((swatch) => {
            const selected = color.toLowerCase() === swatch.hex.toLowerCase()
            return (
              <button
                key={swatch.hex}
                type="button"
                role="option"
                aria-label={swatch.name}
                aria-selected={selected}
                title={swatch.name}
                className={cn(
                  'relative flex size-8 cursor-pointer items-center justify-center rounded-md border border-border/70 shadow-xs outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:scale-100',
                  selected && 'ring-2 ring-ring ring-offset-2 ring-offset-popover',
                )}
                style={{ backgroundColor: swatch.hex }}
                onClick={() => {
                  onColorChange(swatch.hex)
                  setOpen(false)
                }}
              >
                {selected && (
                  <CheckIcon
                    className={cn('size-3.5', isLightHex(swatch.hex) ? 'text-slate-900' : 'text-white')}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
        <DropdownMenuSeparator className="my-2" />
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-xs font-medium outline-none hover:bg-accent focus-within:bg-accent">
          <input
            type="color"
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            aria-label="More colors"
            className="size-7 cursor-pointer rounded-md border border-border bg-background p-0"
          />
          More colors…
        </label>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CaptureEditorToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  text,
  onTextChange,
  effectiveZoom,
  zoom,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoom100,
  onUndo,
  onRedo,
  minZoom,
  maxZoom,
}: CaptureEditorToolbarProps) {
  const activeMeta = TOOLS.find((tool) => tool.id === activeTool)
  const ActiveIcon = activeMeta?.icon ?? SquareIcon

  return (
    <header className="@container shrink-0 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/50 to-transparent"
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2 pr-1">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ActiveIcon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 hidden @[22rem]:block">
              <p className="truncate text-xs font-semibold leading-4 text-foreground">{activeMeta?.label ?? 'Tool'}</p>
              <p className="text-[10px] leading-4 text-muted-foreground">Draw on capture</p>
            </div>
          </div>

          <ToolDivider />

          <ToolbarCluster className="min-w-0 flex-1">
            <div role="toolbar" aria-label="Annotation tools" className="flex min-w-0 flex-wrap items-center gap-2">
              {TOOLS.map(({ id, label, icon: Icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={label}
                      aria-pressed={activeTool === id}
                      className={cn(
                        'rounded-md',
                        activeTool === id
                          ? 'bg-background text-primary shadow-sm ring-1 ring-primary/40'
                          : 'text-muted-foreground hover:bg-background/90 hover:text-foreground',
                      )}
                      onClick={() => onToolChange(id)}
                    >
                      <Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            {activeTool === 'text' && (
              <Input
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="Annotation text…"
                aria-label="Annotation text"
                className="h-8 w-[10rem] shrink-0 border-primary/20 bg-background text-xs shadow-sm"
              />
            )}
          </ToolbarCluster>

          <ToolDivider />

          <ColorDropdown color={color} onColorChange={onColorChange} />

          <ToolbarCluster className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost" className="rounded-md" aria-label="Undo" onClick={onUndo}>
                  <Undo2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost" className="rounded-md" aria-label="Redo" onClick={onRedo}>
                  <Redo2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </ToolbarCluster>

          <ToolDivider />

          <ToolbarCluster className="ml-auto shrink-0 @[48rem]:ml-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-md"
                  aria-label="Zoom out"
                  disabled={effectiveZoom <= minZoom}
                  onClick={onZoomOut}
                >
                  <ZoomOutIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom out</TooltipContent>
            </Tooltip>
            <span
              className="min-w-[2.75rem] px-1 text-center text-xs font-semibold tabular-nums text-foreground"
              aria-live="polite"
            >
              {zoomPercent}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-md"
                  aria-label="Zoom in"
                  disabled={effectiveZoom >= maxZoom}
                  onClick={onZoomIn}
                >
                  <ZoomInIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom in</TooltipContent>
            </Tooltip>
            <div className="hidden h-6 w-px bg-border/70 sm:block" aria-hidden />
            <Button
              type="button"
              size="sm"
              variant={zoom === 'fit' ? 'secondary' : 'ghost'}
              className={cn('hidden h-8 rounded-md px-2.5 text-xs font-semibold sm:inline-flex', zoom === 'fit' && 'text-primary')}
              aria-pressed={zoom === 'fit'}
              onClick={onZoomFit}
            >
              Fit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={zoom === 1 ? 'secondary' : 'ghost'}
              className={cn('hidden h-8 rounded-md px-2.5 text-xs font-semibold sm:inline-flex', zoom === 1 && 'text-primary')}
              aria-pressed={zoom === 1}
              onClick={onZoom100}
            >
              100%
            </Button>
          </ToolbarCluster>
      </div>
    </header>
  )
}
