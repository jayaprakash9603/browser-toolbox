import { Suspense, useEffect, useMemo, type CSSProperties } from 'react'

import type { ToolDefinition } from '@/core/registry'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

import { DemoPoster } from './DemoPoster'
import { DEMO_COMPONENTS } from './loader'
import { categoryAccent } from './stage/accents'
import { DemoHostContext, ToolMetaContext, type DemoHost, type ToolMeta } from './stage/context'

/** How long a still poster stands in for a demo before the host moves on. */
const POSTER_MS = 4400

interface ToolDemoProps {
  tool: ToolDefinition
  host: DemoHost
}

/** The website's walkthrough for `tool`, played the way `host` asks; a still poster when the tool has none. */
export function ToolDemo({ tool, host }: ToolDemoProps) {
  const { name, description } = useToolLabels(tool)
  const accent = categoryAccent(tool.category)
  const meta = useMemo<ToolMeta>(() => ({ id: tool.id, name, icon: tool.icon, accent }), [tool, name, accent])
  const Demo = DEMO_COMPONENTS[tool.id]
  const poster = (
    <>
      <DemoPoster variant={host.variant} description={description} />
      <PosterClock host={host} />
    </>
  )

  return (
    <ToolMetaContext.Provider value={meta}>
      <DemoHostContext.Provider value={host}>
        <div data-demo-stage="" style={{ '--demo-accent': accent } as CSSProperties}>
          {Demo ? (
            <ErrorBoundary resetKey={tool.id} fallback={poster}>
              <Suspense fallback={<DemoPoster variant={host.variant} description={description} loading />}>
                <Demo />
              </Suspense>
            </ErrorBoundary>
          ) : (
            poster
          )}
        </div>
      </DemoHostContext.Provider>
    </ToolMetaContext.Provider>
  )
}

/** Gives a poster the same progress and end-of-cycle signals a demo timeline would. */
function PosterClock({ host }: { host: DemoHost }) {
  const { playing, onProgress, onCycle } = host
  useEffect(() => {
    if (!playing) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / POSTER_MS)
      onProgress?.(progress)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else onCycle?.()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, onProgress, onCycle])
  return null
}
