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

function ToolbarSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-muted/20 p-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--background)_40%,transparent)]',
        className,
      )}
      aria-label={title}
    >
      <h3 className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </section>
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
    <header className="@container shrink-0 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/50 to-transparent"
        aria-hidden
      />
      <div className="flex flex-col gap-2.5 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <ActiveIcon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">Editor toolbar</p>
            <p className="truncate text-sm font-semibold text-foreground">{activeMeta?.label ?? 'Select a tool'}</p>
          </div>
          {activeTool === 'text' && (
            <Input
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="Type here…"
              aria-label="Annotation text"
              className="h-9 w-full max-w-[9.5rem] shrink border-primary/25 bg-background shadow-sm"
            />
          )}
        </div>

        <ToolbarSection title="Draw">
          <div
            role="toolbar"
            aria-label="Annotation tools"
            className="scrollbar-styled -mx-0.5 flex snap-x snap-mandatory gap-1 overflow-x-auto px-0.5 pb-0.5"
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
                      'size-9 shrink-0 snap-start rounded-lg transition-[color,background,box-shadow,transform] duration-200 motion-reduce:transition-none',
                      activeTool === id
                        ? 'scale-[1.02] bg-background text-primary shadow-md ring-2 ring-primary/35 hover:bg-background hover:text-primary'
                        : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
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
        </ToolbarSection>

        <div className="grid grid-cols-1 gap-2 @[22rem]:grid-cols-[minmax(0,1fr)_auto] @[22rem]:items-stretch">
          <ToolbarSection title="Color" className="min-w-0">
            <div className="scrollbar-styled flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {ANNOTATION_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color ${swatch}`}
                  aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
                  className={cn(
                    'size-8 shrink-0 cursor-pointer rounded-full border-2 border-background shadow-sm transition-transform duration-150 hover:scale-105 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    color.toLowerCase() === swatch.toLowerCase() &&
                      'scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                  style={{ backgroundColor: swatch }}
                  onClick={() => onColorChange(swatch)}
                />
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="relative size-8 shrink-0 cursor-pointer rounded-full border-2 border-dashed border-border/80 bg-background shadow-sm transition-colors hover:border-primary/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                    <span className="sr-only">Custom color</span>
                    <Input
                      type="color"
                      value={color}
                      onChange={(event) => onColorChange(event.target.value)}
                      aria-label="Custom annotation color"
                      className="absolute inset-0 size-full cursor-pointer rounded-full border-0 p-0 opacity-0"
                    />
                    <span
                      className="absolute inset-1 rounded-full ring-1 ring-inset ring-border/40"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent side="bottom">Custom color</TooltipContent>
              </Tooltip>
            </div>
          </ToolbarSection>

          <ToolbarSection title="History" className="@[22rem]:w-[5.75rem]">
            <div className="flex items-center justify-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-lg"
                    aria-label="Undo"
                    onClick={onUndo}
                  >
                    <Undo2Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-lg"
                    aria-label="Redo"
                    onClick={onRedo}
                  >
                    <Redo2Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </div>
          </ToolbarSection>
        </div>

        <ToolbarSection title="Canvas zoom">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex min-h-9 flex-1 items-center justify-center gap-0.5 rounded-lg border border-border/50 bg-background/80 p-0.5 shadow-inner">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 rounded-md"
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
                className="min-w-[3.25rem] flex-1 px-1 text-center text-sm font-bold tabular-nums text-foreground"
                aria-live="polite"
              >
                {zoomPercent}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 rounded-md"
                    aria-label="Zoom in"
                    disabled={effectiveZoom >= maxZoom}
                    onClick={onZoomIn}
                  >
                    <ZoomInIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Zoom in</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant={zoom === 'fit' ? 'secondary' : 'outline'}
                className={cn(
                  'h-9 min-w-[3.25rem] rounded-lg font-semibold',
                  zoom === 'fit' && 'border-primary/30 bg-primary/10 text-primary shadow-sm',
                )}
                aria-pressed={zoom === 'fit'}
                onClick={onZoomFit}
              >
                Fit
              </Button>
              <Button
                type="button"
                size="sm"
                variant={zoom === 1 ? 'secondary' : 'outline'}
                className={cn(
                  'h-9 min-w-[3.25rem] rounded-lg font-semibold',
                  zoom === 1 && 'border-primary/30 bg-primary/10 text-primary shadow-sm',
                )}
                aria-pressed={zoom === 1}
                onClick={onZoom100}
              >
                100%
              </Button>
            </div>
          </div>
        </ToolbarSection>
      </div>
    </header>
  )
}
