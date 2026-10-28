import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'

import '@/app/demos/i18n'
import { prefetchDemo } from '@/app/demos/loader'
import { categoryAccent } from '@/app/demos/stage/accents'
import type { DemoHost } from '@/app/demos/stage/context'
import { ToolDemo } from '@/app/demos/ToolDemo'
import type { CategoryDefinition, ToolDefinition } from '@/core/registry'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

interface DemoReelProps {
  category: CategoryDefinition
  tools: readonly ToolDefinition[]
  index: number
  running: boolean
  /** Called when the current tool's walkthrough ends. */
  advance: () => void
}

interface Caption {
  toolId: string
  index: number
  steps: readonly string[]
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Plays each tool's website walkthrough in turn, like a short video. Decorative; the card link carries the label. */
export default function DemoReel({ category, tools, index, running, advance }: DemoReelProps) {
  const tool = tools[index]
  const { name } = useToolLabels(tool)
  const fillRef = useRef<HTMLSpanElement>(null)
  const [caption, setCaption] = useState<Caption | null>(null)
  const toolId = tool.id

  const onStep = useCallback(
    (step: number, steps: readonly string[]) => setCaption({ toolId, index: step, steps }),
    [toolId],
  )
  const onProgress = useCallback((progress: number) => {
    const fill = fillRef.current
    if (fill) fill.style.transform = `scaleX(${progress})`
  }, [])

  const host = useMemo<DemoHost>(
    () => ({ variant: 'card', loop: tools.length < 2, playing: running, onCycle: advance, onStep, onProgress }),
    [tools.length, running, advance, onStep, onProgress],
  )

  useEffect(() => {
    if (running && tools.length > 1) prefetchDemo(tools[(index + 1) % tools.length].id)
  }, [running, index, tools])

  const current = caption?.toolId === toolId ? caption : null

  return (
    <div
      data-demo-stage=""
      className="flex flex-col bg-surface"
      style={{ '--demo-accent': categoryAccent(category.id) } as CSSProperties}
    >
      <motion.div
        key={toolId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <ToolDemo tool={tool} host={host} />
      </motion.div>
      <div className="flex h-[34px] flex-col justify-center gap-[7px] border-t border-line px-2.5">
        <div className="flex gap-1">
          {tools.map((item, segment) => (
            <span key={item.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink/12">
              {segment < index ? <span className="block h-full bg-[var(--accent)] opacity-60" /> : null}
              {segment === index ? (
                <span
                  ref={fillRef}
                  className="block h-full origin-left bg-[var(--accent)]"
                  style={{ transform: 'scaleX(0)' }}
                />
              ) : null}
            </span>
          ))}
        </div>
        <p className="m-0 flex items-center gap-2 text-[10.5px] leading-none">
          {current ? (
            <span className="shrink-0 font-mono text-[9.5px] text-muted tabular-nums">
              {pad(current.index + 1)}/{pad(current.steps.length)}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-ink-soft">{current?.steps[current.index] ?? name}</span>
          <span className="shrink-0 font-mono text-[9.5px] text-muted tabular-nums">
            {index + 1}/{tools.length}
          </span>
        </p>
      </div>
    </div>
  )
}
