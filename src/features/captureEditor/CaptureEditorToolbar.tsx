import type { ReactNode } from 'react'
import type { AnnotationTool } from '@/core/engines/capture'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import {
  ArrowUpRightIcon,
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

const ANNOTATION_SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#0f172a'] as const

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
        'flex min-w-0 items-center gap-1 rounded-lg border border-border/50 bg-muted/15 p-1 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--background)_50%,transparent)]',
        className,
      )}
    >
      {children}
    </div>
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
      <div className="flex flex-col gap-2 px-2 py-2 sm:px-3">
        <div className="flex flex-wrap items-center gap-2 @[48rem]:flex-nowrap @[48rem]:gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ActiveIcon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 hidden @[22rem]:block">
              <p className="truncate text-xs font-semibold text-foreground">{activeMeta?.label ?? 'Tool'}</p>
              <p className="text-[10px] text-muted-foreground">Draw on capture</p>
            </div>
          </div>

          <ToolDivider />

          <ToolbarCluster className="min-w-0 flex-1 @[48rem]:max-w-none">
            <div
              role="toolbar"
              aria-label="Annotation tools"
              className="scrollbar-styled flex min-w-0 flex-1 snap-x snap-mandatory items-center gap-0.5 overflow-x-auto"
            >
              {TOOLS.map(({ id, label, icon: Icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={label}
                      aria-pressed={activeTool === id}
                      className={cn(
                        'size-8 shrink-0 snap-start rounded-md',
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
              <>
                <ToolDivider />
                <Input
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  placeholder="Annotation text…"
                  aria-label="Annotation text"
                  className="h-8 min-w-[7rem] max-w-[11rem] shrink border-primary/20 bg-background text-xs shadow-sm"
                />
              </>
            )}
          </ToolbarCluster>

          <ToolDivider />

          <ToolbarCluster className="scrollbar-styled max-w-full overflow-x-auto @[48rem]:max-w-[14rem]">
            {ANNOTATION_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Color ${swatch}`}
                aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
                className={cn(
                  'size-7 shrink-0 cursor-pointer rounded-full border-2 border-background shadow-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  color.toLowerCase() === swatch.toLowerCase() && 'ring-2 ring-primary ring-offset-1',
                )}
                style={{ backgroundColor: swatch }}
                onClick={() => onColorChange(swatch)}
              />
            ))}
            <label className="relative size-7 shrink-0 cursor-pointer rounded-full border-2 border-dashed border-border bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="sr-only">Custom color</span>
              <Input
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                aria-label="Custom annotation color"
                className="absolute inset-0 size-full cursor-pointer rounded-full border-0 p-0 opacity-0"
              />
              <span
                className="absolute inset-0.5 rounded-full ring-1 ring-inset ring-border/50"
                style={{ backgroundColor: color }}
                aria-hidden
              />
            </label>
          </ToolbarCluster>

          <ToolDivider />

          <ToolbarCluster className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8 rounded-md" aria-label="Undo" onClick={onUndo}>
                  <Undo2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8 rounded-md" aria-label="Redo" onClick={onRedo}>
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
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-md"
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
              className="min-w-[3rem] px-1 text-center text-xs font-bold tabular-nums text-foreground"
              aria-live="polite"
            >
              {zoomPercent}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-md"
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
              className={cn('hidden h-8 rounded-md px-2 text-xs font-semibold sm:inline-flex', zoom === 'fit' && 'text-primary')}
              aria-pressed={zoom === 'fit'}
              onClick={onZoomFit}
            >
              Fit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={zoom === 1 ? 'secondary' : 'ghost'}
              className={cn('hidden h-8 rounded-md px-2 text-xs font-semibold sm:inline-flex', zoom === 1 && 'text-primary')}
              aria-pressed={zoom === 1}
              onClick={onZoom100}
            >
              100%
            </Button>
          </ToolbarCluster>
        </div>
      </div>
    </header>
  )
}
