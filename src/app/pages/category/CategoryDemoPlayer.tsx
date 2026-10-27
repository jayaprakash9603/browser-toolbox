import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import '@/app/demos/i18n'
import { loadDemoSteps, prefetchDemo } from '@/app/demos/loader'
import type { DemoControls, DemoHost } from '@/app/demos/stage/context'
import type { WalkStep } from '@/app/demos/stage/types'
import { ToolDemo } from '@/app/demos/ToolDemo'
import { usePageVisible } from '@/app/pages/home/useDemoCycle'
import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { ChipRail } from '@/shared/components/ChipRail'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'

/** Website-style walkthrough player for a category: one demo at a time, a tool switcher and the steps. */
export default function CategoryDemoPlayer({ tools }: { tools: readonly ToolDefinition[] }) {
  const { t } = useTranslation()
  const ids = useId()
  const panelId = `${ids}-panel`
  const count = tools.length
  const [selected, setSelected] = useState(0)
  const [auto, setAuto] = useState(count > 1)
  const [step, setStep] = useState<{ toolId: string; index: number } | null>(null)
  const [walk, setWalk] = useState<{ toolId: string; steps: readonly WalkStep[] } | null>(null)
  const controlsRef = useRef<DemoControls | null>(null)
  const pageVisible = usePageVisible()
  const tool = tools[Math.min(selected, count - 1)]
  const toolId = tool.id

  useEffect(() => {
    let cancelled = false
    loadDemoSteps(toolId)
      .then((steps) => {
        if (!cancelled) setWalk({ toolId, steps })
      })
      .catch(() => {
        if (!cancelled) setWalk({ toolId, steps: [] })
      })
    return () => {
      cancelled = true
    }
  }, [toolId])

  useEffect(() => {
    if (auto && count > 1) prefetchDemo(tools[(selected + 1) % count].id)
  }, [auto, count, selected, tools])

  const onCycle = useCallback(() => {
    if (auto && count > 1) setSelected((current) => (current + 1) % count)
  }, [auto, count])
  const onStep = useCallback((index: number) => setStep({ toolId, index }), [toolId])
  const onControls = useCallback((controls: DemoControls | null) => {
    controlsRef.current = controls
  }, [])

  const host = useMemo<DemoHost>(
    () => ({ variant: 'player', loop: true, playing: pageVisible, onCycle, onStep, onControls }),
    [pageVisible, onCycle, onStep, onControls],
  )

  const choose = (index: number) => {
    setAuto(false)
    setSelected((index + count) % count)
  }

  const steps = walk?.toolId === toolId ? walk.steps : []
  const activeStep = step?.toolId === toolId ? step.index : 0

  return (
    <div className="rounded-2xl border bg-card p-2.5 @[720px]:p-3">
      {count > 1 ? (
        <div className="mb-2.5 flex flex-col gap-2">
          <ToolTabs tools={tools} selected={selected} idPrefix={ids} panelId={panelId} onSelect={choose} />
          <div className="flex items-center gap-2 px-0.5">
            <span className="flex items-center text-[11px] text-muted-foreground tabular-nums">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6"
                onClick={() => choose(selected - 1)}
                aria-label={t('demo.player.previous')}
                title={t('demo.player.previous')}
              >
                <ChevronLeftIcon aria-hidden />
              </Button>
              {t('demo.toolOf', { current: selected + 1, total: count })}
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6"
                onClick={() => choose(selected + 1)}
                aria-label={t('demo.player.next')}
                title={t('demo.player.next')}
              >
                <ChevronRightIcon aria-hidden />
              </Button>
            </span>
            <label
              className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground"
              title={t('demo.player.autoAdvanceHint')}
            >
              <Switch checked={auto} onCheckedChange={setAuto} />
              <span className="@max-[420px]:sr-only">{t('demo.player.autoAdvance')}</span>
            </label>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 @[720px]:grid-cols-[minmax(0,1.45fr)_minmax(15rem,1fr)] @[720px]:items-start">
        <div
          id={panelId}
          role={count > 1 ? 'tabpanel' : undefined}
          aria-labelledby={count > 1 ? `${ids}-tab-${toolId}` : undefined}
          className="min-w-0"
        >
          <ToolDemo tool={tool} host={host} />
        </div>
        <ToolDetails
          tool={tool}
          steps={steps}
          activeStep={activeStep}
          onJump={(index) => controlsRef.current?.jump(index)}
        />
      </div>
    </div>
  )
}

function ToolDetails({
  tool,
  steps,
  activeStep,
  onJump,
}: {
  tool: ToolDefinition
  steps: readonly WalkStep[]
  activeStep: number
  onJump: (index: number) => void
}) {
  const { t } = useTranslation()
  const { name, description } = useToolLabels(tool)
  const Icon = tool.icon
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-4.5">
          <Icon aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      {steps.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('demo.player.steps')}
          </p>
          <ol className="flex flex-col gap-1">
            {steps.map((item, index) => {
              const active = index === activeStep
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => onJump(index)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={t('demo.stepLabel', { index: index + 1, title: item.title })}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                      active ? 'border-primary/35 bg-primary/[0.06]' : 'border-transparent hover:bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-px flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] tabular-nums transition-colors duration-200',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{item.title}</span>
                      <span
                        className={cn(
                          'mt-0.5 block text-[11px] leading-snug text-muted-foreground',
                          !active && '@max-[719px]:hidden',
                        )}
                      >
                        {item.body}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      <Button asChild size="sm" className="self-start">
        <Link to={tool.route}>
          {t('demo.player.open', { name })}
          <ArrowRightIcon aria-hidden />
        </Link>
      </Button>
    </div>
  )
}

function ToolTabs({
  tools,
  selected,
  idPrefix,
  panelId,
  onSelect,
}: {
  tools: readonly ToolDefinition[]
  selected: number
  idPrefix: string
  panelId: string
  onSelect: (index: number) => void
}) {
  const { t } = useTranslation()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const tab = tabRefs.current[selected]
    if (!tab) return
    try {
      tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    } catch {
      // jsdom does not implement scrollIntoView.
    }
  }, [selected])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = tools.length - 1
    const next =
      event.key === 'ArrowRight'
        ? selected === last
          ? 0
          : selected + 1
        : event.key === 'ArrowLeft'
          ? selected === 0
            ? last
            : selected - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1
    if (next < 0) return
    event.preventDefault()
    onSelect(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div onKeyDown={onKeyDown}>
      <ChipRail role="tablist" label={t('demo.player.tools')} rows={1} className="min-w-0">
        {tools.map((item, index) => (
          <ToolTab
            key={item.id}
            tool={item}
            id={`${idPrefix}-tab-${item.id}`}
            panelId={panelId}
            active={index === selected}
            onSelect={() => onSelect(index)}
            tabRef={(node) => {
              tabRefs.current[index] = node
            }}
          />
        ))}
      </ChipRail>
    </div>
  )
}

function ToolTab({
  tool,
  id,
  panelId,
  active,
  onSelect,
  tabRef,
}: {
  tool: ToolDefinition
  id: string
  panelId: string
  active: boolean
  onSelect: () => void
  tabRef: (node: HTMLButtonElement | null) => void
}) {
  const { name } = useToolLabels(tool)
  const Icon = tool.icon
  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:size-3.5',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-transparent bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
      )}
    >
      <Icon aria-hidden />
      {name}
    </button>
  )
}
