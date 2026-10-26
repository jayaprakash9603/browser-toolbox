import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { CategoryDefinition, ToolDefinition } from '@/core/registry'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'
import { EASE, from } from '@/app/pages/home/demo/beat'
import { CategoryScene } from '@/app/pages/home/demo/scenes'

/** Design size of the reel; it is scaled to the card so every width shows the same frame. */
const REEL_W = 320
const REEL_H = 236

interface DemoReelProps {
  category: CategoryDefinition
  tools: readonly ToolDefinition[]
  index: number
  stepMs: number
  running: boolean
}

/** A looping, video-like walkthrough of every tool in a category. Decorative; the card link carries the label. */
export default function DemoReel({ category, tools, index, stepMs, running }: DemoReelProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return
    const update = () => setScale(frame.clientWidth / REEL_W || 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const tool = tools[index]

  return (
    <div ref={frameRef} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute top-0 left-0 origin-top-left select-none"
        style={{ width: REEL_W, height: REEL_H, transform: `scale(${scale})` }}
      >
        <Progress count={tools.length} index={index} stepMs={stepMs} running={running} />
        <AnimatePresence initial={false} mode="popLayout">
          <Beat
            key={tool.id}
            tool={tool}
            category={category}
            position={index}
            total={tools.length}
            play={running}
          />
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Story-style segments: finished tools are full, the current one fills over its step. */
function Progress({ count, index, stepMs, running }: { count: number; index: number; stepMs: number; running: boolean }) {
  return (
    <div className="absolute inset-x-3 top-2.5 flex gap-1">
      {Array.from({ length: count }, (_, segment) => (
        <span key={segment} className="h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/12">
          {segment < index && <span className="block h-full bg-primary/70" />}
          {segment === index && (
            <motion.span
              key={`${index}-${running}`}
              className="block h-full origin-left bg-primary"
              initial={running ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{ duration: stepMs / 1000, ease: 'linear' }}
            />
          )}
        </span>
      ))}
    </div>
  )
}

function Beat({
  tool,
  category,
  position,
  total,
  play,
}: {
  tool: ToolDefinition
  category: CategoryDefinition
  position: number
  total: number
  play: boolean
}) {
  const { t } = useTranslation()
  const { name, description } = useToolLabels(tool)
  const ToolIcon = tool.icon
  const words = description.split(/\s+/).filter(Boolean)

  return (
    <motion.div
      className="absolute inset-x-0 top-[18px] bottom-0"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <div className="flex h-9 items-center gap-2 px-3">
        <motion.span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground [&_svg]:size-4"
          initial={from(play, { scale: 0.4, rotate: -20 })}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 16, delay: 0.1 }}
        >
          <ToolIcon />
        </motion.span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] leading-4 font-semibold text-foreground">{name}</span>
          <span className="text-[9.5px] leading-3 text-muted-foreground tabular-nums">
            {t('home.demo.step', { current: position + 1, total })}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full border bg-background/80 px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span className={cn('size-1.5 rounded-full bg-primary', play && 'animate-pulse')} />
          {t('home.demo.live')}
        </span>
      </div>

      <div className="absolute inset-x-2.5 top-10 h-[122px] overflow-hidden rounded-xl border bg-background">
        <CategoryScene categoryId={category.id} tool={tool} play={play} />
      </div>

      <p className="absolute inset-x-2.5 bottom-2 line-clamp-2 min-h-[34px] rounded-lg bg-foreground/[0.88] px-2.5 py-1.5 text-[10.5px] leading-[14px] text-background">
        {words.map((word, i) => (
          <motion.span
            key={`${i}-${word}`}
            className="inline-block"
            initial={from(play, { opacity: 0, y: 4 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.5 + Math.min(i, 30) * 0.045, ease: EASE }}
          >
            {word}&nbsp;
          </motion.span>
        ))}
      </p>
    </motion.div>
  )
}
