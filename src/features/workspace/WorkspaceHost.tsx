import { Suspense, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@/app/navigation'
import { toolRegistry } from '@/core/registry'
import { getSectionForTool } from '@/core/registry/sections'
import type { WorkspaceDefinition } from '@/core/registry/workspaces'
import { getToolName } from '@/i18n/toolLabels'
import { BackButton } from '@/shared/components/BackButton'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { WorkspaceContext, WorkspaceHeaderSlotContext } from './WorkspaceContext'

interface WorkspaceHostProps {
  workspace: WorkspaceDefinition
  activeToolId: string
  children: ReactNode
}

const ENTER_EASE = [0.22, 1, 0.36, 1] as const
const EXIT_EASE = [0.4, 0, 1, 1] as const
const SLIDE_DISTANCE = 28

/** Light placeholder shown only while a tool module is still loading. */
function ViewShimmer({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex h-full flex-col gap-3 p-4">
      <span className="sr-only">{label}</span>
      <div className="h-9 w-2/5 rounded-md bg-muted/70 motion-safe:animate-pulse" />
      <div className="h-24 w-full rounded-lg bg-muted/50 motion-safe:animate-pulse" />
      <div className="grid flex-1 grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/40 motion-safe:animate-pulse" />
        <div className="rounded-lg bg-muted/40 motion-safe:animate-pulse" />
      </div>
    </div>
  )
}

export function WorkspaceHost({ workspace, activeToolId, children }: WorkspaceHostProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null)

  // Direction of the last tab change: +1 moves right (later tab), -1 moves left.
  // Derived during render (state, not refs) so an in-flight exit keeps its direction.
  const activeIndex = workspace.views.findIndex((view) => view.toolId === activeToolId)
  const [tabMotion, setTabMotion] = useState({ index: activeIndex, direction: 1 })
  let direction = tabMotion.direction
  if (tabMotion.index !== activeIndex) {
    direction = activeIndex >= 0 && tabMotion.index >= 0 && activeIndex < tabMotion.index ? -1 : 1
    setTabMotion({ index: activeIndex, direction })
  }

  const host = toolRegistry.get(workspace.id)
  if (!host) return <>{children}</>

  const HostIcon = host.icon
  const section = getSectionForTool(workspace.id)
  const activeView = workspace.views.find((view) => view.toolId === activeToolId)
  const hostName = getToolName(host, t)

  const openView = (key: string) => {
    const view = workspace.views.find((entry) => entry.key === key)
    const target = view && toolRegistry.get(view.toolId)
    if (target) navigate(target.route)
  }

  const transitionIn = reduceMotion ? { duration: 0.01 } : { duration: 0.24, ease: ENTER_EASE }
  const transitionOut = reduceMotion ? { duration: 0.01 } : { duration: 0.16, ease: EXIT_EASE }

  const viewVariants: Variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : dir * SLIDE_DISTANCE,
      scale: reduceMotion ? 1 : 0.985,
      transition: transitionIn,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: transitionIn,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : dir * -SLIDE_DISTANCE * 0.6,
      scale: reduceMotion ? 1 : 0.99,
      transition: transitionOut,
    }),
  }

  return (
    <WorkspaceContext.Provider value={workspace.id}>
      <div className="flex h-full flex-col" data-workspace={workspace.id}>
        <header className="flex shrink-0 items-center gap-2.5 px-3 py-1.5 @[360px]:px-4">
          <BackButton to={section ? `/categories/${section.id}` : '/'} />
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-sm">
            <HostIcon className="size-4 text-primary" aria-hidden />
          </div>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
            {hostName}
          </h1>
          {/* Child tools portal their actions (info, favorite, more) into this slot. */}
          <div ref={setHeaderSlot} className="flex shrink-0 items-center gap-1" />
        </header>
        <nav
          aria-label={t('workspace.navigation', {
            defaultValue: '{{name}} sections',
            name: hostName,
          })}
          className="shrink-0 border-b px-3 pb-1.5 @[360px]:px-4"
        >
          <Tabs value={activeView?.key ?? ''} onValueChange={openView} className="gap-0">
            <TabsList variant="attached" fullWidth>
              {workspace.views.map((view) => {
                const target = toolRegistry.get(view.toolId)
                const ViewIcon = view.icon ?? target?.icon
                return (
                  <TabsTrigger key={view.key} value={view.key}>
                    {ViewIcon && <ViewIcon aria-hidden />}
                    {t(`workspace.${workspace.id}.${view.key}`, { defaultValue: view.label })}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </nav>
        <WorkspaceHeaderSlotContext.Provider value={headerSlot}>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <Suspense fallback={<ViewShimmer label={t('nav.loading')} />}>
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={activeToolId}
                  custom={direction}
                  variants={viewVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex h-full flex-col will-change-transform"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
        </WorkspaceHeaderSlotContext.Provider>
      </div>
    </WorkspaceContext.Provider>
  )
}
