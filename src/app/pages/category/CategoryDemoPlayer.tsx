import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClapperboardIcon,
} from 'lucide-react'
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
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'

const HIDDEN_KEY = 'tbx.category.demo.hidden'

function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeHidden(hidden: boolean) {
  try {
    localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0')
  } catch {
    // Storage can be unavailable in private contexts; the toggle still works for this visit.
  }
}

/** Website-style walkthrough player for a category: one demo at a time, a tool switcher and the steps. */
export default function CategoryDemoPlayer({ tools }: { tools: readonly ToolDefinition[] }) {
  const { t } = useTranslation()
  const ids = useId()
  const headingId = `${ids}-heading`
  const panelId = `${ids}-panel`
  const count = tools.length
  const [selected, setSelected] = useState(0)
  const [auto, setAuto] = useState(count > 1)
  const [hidden, setHidden] = useState(readHidden)
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
    if (!hidden && auto && count > 1) prefetchDemo(tools[(selected + 1) % count].id)
  }, [hidden, auto, count, selected, tools])

  const onCycle = useCallback(() => {
    if (auto && count > 1) setSelected((current) => (current + 1) % count)
  }, [auto, count])
  const onStep = useCallback((index: number) => setStep({ toolId, index }), [toolId])
  const onControls = useCallback((controls: DemoControls | null) => {
    controlsRef.current = controls
  }, [])

  const host = useMemo<DemoHost>(
    () => ({ variant: 'player', loop: true, playing: pageVisible && !hidden, onCycle, onStep, onControls }),
    [pageVisible, hidden, onCycle, onStep, onControls],
  )

  const choose = (index: number) => {
    setAuto(false)
    setSelected((index + count) % count)
  }

  const toggleHidden = () => {
    setHidden((current) => {
      writeHidden(!current)
      return !current
    })
  }

  const steps = walk?.toolId === toolId ? walk.steps : []
  const activeStep = step?.toolId === toolId ? step.index : 0
  const HiddenIcon = hidden ? ChevronDownIcon : ChevronUpIcon

  return (
    <section aria-labelledby={headingId} className="mb-4 rounded-2xl border bg-card p-2.5 @[720px]:p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-0.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-3.5">
          <ClapperboardIcon aria-hidden />
        </span>
        <h2 id={headingId} className="text-xs font-semibold">
          {t('demo.player.heading')}
        </h2>
        {!hidden && count > 1 ? (
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
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {!hidden && count > 1 ? (
            <label
              className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground"
              title={t('demo.player.autoAdvanceHint')}
            >
              <Switch checked={auto} onCheckedChange={setAuto} />
              <span className="@max-[420px]:sr-only">{t('demo.player.autoAdvance')}</span>
            </label>
          ) : null}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleHidden}
            aria-expanded={!hidden}
            aria-controls={panelId}
            aria-label={hidden ? t('demo.player.show') : t('demo.player.hide')}
            title={hidden ? t('demo.player.show') : t('demo.player.hide')}
          >
            <HiddenIcon aria-hidden />
          </Button>
        </div>
      </div>

      {hidden ? null : (
        <div id={panelId} className="mt-2.5 flex flex-col gap-3">
          <div className="grid gap-3 @[720px]:grid-cols-[minmax(0,1.45fr)_minmax(15rem,1fr)] @[720px]:items-start">
            <div
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
          {count > 1 ? <ToolTabs tools={tools} selected={selected} idPrefix={ids} panelId={panelId} onSelect={choose} /> : null}
        </div>
      )}
    </section>
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
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Keeps the active tab in view by scrolling the strip only, never the page.
  useEffect(() => {
    const list = listRef.current
    const tab = tabRefs.current[selected]
    if (!list || !tab || typeof list.scrollTo !== 'function') return
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
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
    <div
      ref={listRef}
      role="tablist"
      aria-label={t('demo.player.tools')}
      onKeyDown={onKeyDown}
      className="scrollbar-none -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 py-0.5"
    >
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
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:size-3.5',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon aria-hidden />
      {name}
    </button>
  )
}
