import { motion } from 'motion/react'
import { CheckIcon, LockIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ToolDefinition } from '@/core/registry'
import { cn } from '@/shared/utils/cn'
import { at, from, pick, seedOf } from '@/app/pages/home/demo/beat'

interface SceneProps {
  tool: ToolDefinition
  play: boolean
  seed: number
}
/** Pointer that glides to (x, y) inside the stage and presses at `press` seconds. */
function Cursor({ x, y, press, play }: { x: number; y: number; press: number; play: boolean }) {
  if (!play) return null
  const travel = 0.55
  const start = press - travel
  return (
    <>
      <motion.span
        className="pointer-events-none absolute z-20 -mt-3 -ml-3 size-6 rounded-full border-2 border-primary"
        style={{ left: x, top: y }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.4, 0.6, 1.6] }}
        transition={{ duration: 0.55, delay: press, times: [0, 0.15, 1] }}
      />
      <motion.svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute z-30 size-4 drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)]"
        style={{ left: x - 3, top: y - 2 }}
        initial={{ opacity: 0, x: 70, y: 40 }}
        animate={{ opacity: [0, 1, 1, 1, 0], x: [70, 0, 0, 0, 6], y: [40, 0, 0, 0, 10], scale: [1, 1, 0.8, 1, 1] }}
        transition={{ duration: travel + 1.1, delay: start, times: [0, 0.33, 0.38, 0.45, 1], ease: EASE }}
      >
        <path
          d="M4 2.5 19.5 11l-6.6 1.9L9.6 19.8z"
          className="fill-background stroke-foreground"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </motion.svg>
    </>
  )
}

function Bar({ width, delay, play, className }: { width: string; delay: number; play: boolean; className?: string }) {
  return (
    <motion.span
      className={cn('block h-[5px] origin-left rounded-full bg-foreground/20', className)}
      style={{ width }}
      initial={from(play, { scaleX: 0 })}
      animate={{ scaleX: 1 }}
      transition={at(delay, 0.45)}
    />
  )
}

/** Text, code and data tools: input lines flow through the tool and come out transformed. */
function TransformScene({ tool, play, seed }: SceneProps) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const widths = [0, 1, 2, 3].map((n) => `${55 + Math.round(pick(seed, n) * 40)}%`)
  return (
    <div className="absolute inset-0">
      <div className="absolute top-3 left-3 h-[94px] w-[104px] rounded-lg border bg-muted/40 p-2">
        <span className="mb-1.5 block text-[7.5px] font-bold tracking-widest text-muted-foreground uppercase">
          {t('home.demo.input')}
        </span>
        <div className="flex flex-col gap-1.5">
          {widths.map((width, n) => (
            <Bar key={n} width={width} delay={0.3 + n * 0.12} play={play} />
          ))}
        </div>
      </div>

      <motion.span
        className="absolute top-[38px] left-[129px] h-0.5 w-[38px] origin-left rounded-full bg-primary/40"
        initial={from(play, { scaleX: 0 })}
        animate={{ scaleX: 1 }}
        transition={at(0.85, 0.3)}
      />
      {play && (
        <motion.span
          className="absolute top-[35px] left-[127px] size-2 rounded-full bg-primary"
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: [0, 40], opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: 0.95, repeat: 2, repeatDelay: 0.25 }}
        />
      )}
      <motion.span
        className="absolute top-[52px] left-[130px] flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)] [&_svg]:size-4"
        initial={from(play, { scale: 0.5, rotate: -90 })}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.75 }}
      >
        <Icon />
      </motion.span>

      <div className="absolute top-3 right-3 h-[94px] w-[104px] rounded-lg border border-primary/30 bg-primary/[0.06] p-2">
        <span className="mb-1.5 block text-[7.5px] font-bold tracking-widest text-primary uppercase">
          {t('home.demo.output')}
        </span>
        <div className="flex flex-col gap-1.5">
          {widths.map((width, n) => (
            <Bar key={n} width={width} delay={1.35 + n * 0.1} play={play} className="bg-primary/45" />
          ))}
        </div>
        <motion.span
          className="absolute right-1.5 bottom-1.5 flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-semibold text-primary-foreground [&_svg]:size-2.5"
          initial={from(play, { opacity: 0, scale: 0.6, y: 4 })}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 2.35 }}
        >
          <CheckIcon strokeWidth={3} />
          {t('home.demo.copied')}
        </motion.span>
      </div>
      <Cursor x={262} y={96} press={2.3} play={play} />
    </div>
  )
}

/** Web, QA, SEO and API tools: a page is scanned and the tool pins what it found. */
function InspectScene({ tool, play, seed }: SceneProps) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const target = seed % 3
  const slug = tool.id.split('.').pop() ?? tool.id
  const cardX = (n: number) => 20 + n * 88
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-2 top-2 flex h-5 items-center gap-1.5 rounded-md bg-muted/60 px-2">
        <span className="size-1.5 rounded-full bg-foreground/20" />
        <span className="size-1.5 rounded-full bg-foreground/20" />
        <span className="flex h-3.5 min-w-0 flex-1 items-center gap-1 rounded-full bg-background px-1.5 font-mono text-[8px] text-muted-foreground [&_svg]:size-2">
          <LockIcon className="shrink-0" />
          <motion.span
            className="truncate"
            initial={from(play, { clipPath: 'inset(0 100% 0 0)' })}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'linear' }}
          >
            example.com/{slug}
          </motion.span>
        </span>
      </div>

      <div className="absolute top-9 left-5 h-2 w-16 rounded-full bg-foreground/15" />
      <div className="absolute top-9 right-5 flex gap-1">
        <span className="h-2 w-6 rounded-full bg-foreground/10" />
        <span className="h-2 w-6 rounded-full bg-foreground/10" />
      </div>
      <div className="absolute top-[50px] left-5 h-3 w-[150px] rounded bg-foreground/12" />
      {[0, 1, 2].map((n) => (
        <div
          key={n}
          className="absolute top-[72px] flex h-[38px] w-[80px] flex-col gap-1 rounded-md border bg-muted/30 p-1.5"
          style={{ left: cardX(n) }}
        >
          <span className="h-3 w-5 rounded bg-foreground/12" />
          <span className="h-1.5 w-12 rounded-full bg-foreground/12" />
        </div>
      ))}

      {play && (
        <motion.span
          className="absolute inset-x-2 top-7 h-8 border-b-2 border-primary bg-gradient-to-b from-transparent to-primary/20"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, 64], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.1, delay: 0.45, ease: 'easeInOut' }}
        />
      )}

      <motion.span
        className="absolute top-[69px] h-[44px] w-[86px] rounded-lg border-2 border-dashed border-primary bg-primary/[0.08]"
        style={{ left: cardX(target) - 3 }}
        initial={from(play, { opacity: 0, scale: 0.85 })}
        animate={{ opacity: 1, scale: 1 }}
        transition={at(1.55, 0.3)}
      />
      <motion.span
        className="absolute top-[54px] z-10 flex max-w-[150px] items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-semibold whitespace-nowrap text-primary-foreground [&_svg]:size-2.5 [&_svg]:shrink-0"
        style={{ left: Math.min(cardX(target) - 3, 140) }}
        initial={from(play, { opacity: 0, y: 6 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 1.75 }}
      >
        <Icon />
        <span className="truncate">{t('home.demo.found')}</span>
      </motion.span>
      <Cursor x={cardX(target) + 40} y={92} press={1.5} play={play} />
    </div>
  )
}

const SWATCHES = ['bg-amber-400', 'bg-sky-400', 'bg-emerald-500', 'bg-rose-400', 'bg-primary']

/** Design, image and screenshot tools: a picture gets cropped, sampled and exported. */
function VisualScene({ tool, play, seed }: SceneProps) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const shift = Math.round(pick(seed, 1) * 16)
  return (
    <div className="absolute inset-0">
      <div className="absolute top-2.5 left-2.5 h-[100px] w-[178px] overflow-hidden rounded-lg bg-gradient-to-b from-sky-400/45 to-amber-200/40">
        <motion.span
          className="absolute top-3 size-5 rounded-full bg-amber-400"
          style={{ right: 22 + shift }}
          initial={from(play, { y: 26, opacity: 0.4 })}
          animate={{ y: 0, opacity: 1 }}
          transition={at(0.2, 0.9)}
        />
        <span className="absolute -bottom-1 -left-4 h-14 w-28 bg-emerald-600/60 [clip-path:polygon(0_100%,45%_0,100%_100%)]" />
        <span className="absolute -right-6 -bottom-1 h-16 w-36 bg-emerald-500/55 [clip-path:polygon(0_100%,55%_0,100%_100%)]" />
        <motion.span
          className="absolute top-[18px] h-[62px] w-[104px] rounded border-2 border-dashed border-white shadow-[0_0_0_999px_rgb(0_0_0/0.28)]"
          style={{ left: 30 + shift }}
          initial={from(play, { opacity: 0, scale: 1.5 })}
          animate={{ opacity: 1, scale: 1 }}
          transition={at(0.85, 0.5)}
        >
          {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-right-1 -bottom-1'].map((corner) => (
            <span key={corner} className={cn('absolute size-2 rounded-sm bg-white', corner)} />
          ))}
        </motion.span>
      </div>

      <div className="absolute top-2.5 right-2.5 flex h-[100px] w-[96px] flex-col gap-2 rounded-lg border bg-muted/40 p-2">
        <span className="flex items-center gap-1.5 text-[8px] font-semibold text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-md bg-primary/12 text-primary [&_svg]:size-3">
            <Icon />
          </span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((swatch, n) => (
            <motion.span
              key={swatch}
              className={cn('size-[18px] rounded-full ring-2 ring-background', swatch)}
              initial={from(play, { scale: 0 })}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 1.45 + n * 0.09 }}
            />
          ))}
        </div>
        <motion.span
          className="mt-auto flex h-5 items-center justify-center rounded-md bg-primary text-[8.5px] font-semibold text-primary-foreground"
          initial={from(play, { opacity: 0.35 })}
          animate={{ opacity: 1 }}
          transition={at(2.3, 0.2)}
        >
          {t('home.demo.export')}
        </motion.span>
      </div>
      <Cursor x={250} y={93} press={2.25} play={play} />
    </div>
  )
}

/** Generators, calculators and time tools: one press rolls out a fresh result. */
function GenerateScene({ tool, play, seed }: SceneProps) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const digits = [0, 1, 2, 3].map((n) => Math.floor(pick(seed, n) * 10))
  const cells = Array.from({ length: 36 }, (_, n) => {
    const row = Math.floor(n / 6)
    const col = n % 6
    const finder = (row < 2 && col < 2) || (row < 2 && col > 3) || (row > 3 && col < 2)
    return { on: finder || pick(seed, n + 7) > 0.5, finder, order: pick(seed, n + 50) }
  })
  return (
    <div className="absolute inset-0">
      <div className="absolute top-3 left-3 flex h-[54px] w-[150px] items-center justify-center gap-1 rounded-lg border bg-muted/40">
        {digits.map((digit, n) => (
          <span key={n} className="h-7 w-[22px] overflow-hidden rounded bg-background font-mono text-[20px] leading-7 font-semibold text-foreground tabular-nums">
            <motion.span
              className="flex flex-col items-center"
              initial={from(play, { y: 0 })}
              animate={{ y: -(10 + digit) * 28 }}
              transition={{ duration: 1, delay: 0.6 + n * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              {Array.from({ length: 20 }, (_, k) => (
                <span key={k}>{k % 10}</span>
              ))}
            </motion.span>
          </span>
        ))}
      </div>
      <span className="absolute top-[74px] left-3 flex h-[30px] w-[150px] items-center justify-center gap-1.5 rounded-lg bg-primary text-[10px] font-semibold text-primary-foreground [&_svg]:size-3.5">
        <Icon />
        {t('home.demo.generate')}
      </span>

      <div className="absolute top-3 right-3 grid size-[96px] grid-cols-6 gap-[3px] rounded-lg border bg-background p-2">
        {cells.map((cell, n) => (
          <motion.span
            key={n}
            className={cn('rounded-[2px]', cell.on ? (cell.finder ? 'bg-foreground' : 'bg-foreground/75') : 'bg-transparent')}
            initial={from(play, { scale: 0 })}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.75 + cell.order * 1.1 }}
          />
        ))}
      </div>
      <Cursor x={88} y={89} press={0.55} play={play} />
    </div>
  )
}

/** Privacy and security tools: incoming requests hit the shield and get stopped. */
function ShieldScene({ tool, play }: SceneProps) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const rows = [0, 1, 2, 3]
  return (
    <div className="absolute inset-0">
      <div className="absolute top-2.5 left-3 flex w-[136px] flex-col gap-1.5">
        {rows.map((n) => (
          <motion.span
            key={n}
            className="relative flex h-[22px] items-center gap-1.5 overflow-hidden rounded-md border bg-muted/40 px-1.5"
            initial={from(play, { x: -40, opacity: 0 })}
            animate={{ x: 0, opacity: 1 }}
            transition={at(0.25 + n * 0.14, 0.4)}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-foreground/30" />
            <span className="h-1.5 flex-1 rounded-full bg-foreground/15" />
            <motion.span
              className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white [&_svg]:size-2"
              initial={from(play, { scale: 0 })}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 1.25 + n * 0.2 }}
            >
              <XIcon strokeWidth={3.5} />
            </motion.span>
            <motion.span
              className="absolute inset-x-1.5 top-1/2 h-px origin-left bg-rose-500/70"
              initial={from(play, { scaleX: 0 })}
              animate={{ scaleX: 1 }}
              transition={at(1.2 + n * 0.2, 0.3)}
            />
          </motion.span>
        ))}
      </div>

      <div className="absolute top-1/2 right-[52px] -mt-7 size-14">
        {play &&
          [0, 1].map((ring) => (
            <motion.span
              key={ring}
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 2], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, delay: 0.5 + ring * 0.7, repeat: 1, repeatDelay: 0 }}
            />
          ))}
        <motion.span
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)] [&_svg]:size-6"
          initial={from(play, { scale: 0.5, rotate: 12 })}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}
        >
          <Icon />
        </motion.span>
      </div>
      <motion.span
        className="absolute right-3 bottom-2.5 rounded-full bg-rose-500/12 px-2 py-0.5 text-[8.5px] font-semibold text-rose-600 dark:text-rose-400"
        initial={from(play, { opacity: 0, y: 6 })}
        animate={{ opacity: 1, y: 0 }}
        transition={at(2.15, 0.3)}
      >
        {t('home.demo.blocked', { count: rows.length })}
      </motion.span>
    </div>
  )
}

/** Productivity, file and browser tools: items line up, one gets done, the change is saved. */
function OrganizeScene({ tool, play, seed }: SceneProps) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const widths = [0, 1, 2].map((n) => `${40 + Math.round(pick(seed, n) * 45)}%`)
  const done = 1
  return (
    <div className="absolute inset-0">
      {widths.map((width, n) => (
        <motion.div
          key={n}
          className="absolute inset-x-3 flex h-[24px] items-center gap-2 rounded-lg border bg-muted/30 px-2"
          style={{ top: 8 + n * 29 }}
          initial={from(play, { y: 10, opacity: 0 })}
          animate={{ y: 0, opacity: 1 }}
          transition={at(0.2 + n * 0.12, 0.4)}
        >
          <span className="relative flex size-3 shrink-0 items-center justify-center rounded-[4px] border border-foreground/30">
            {n === done && (
              <motion.span
                className="absolute inset-[-1px] flex items-center justify-center rounded-[4px] bg-primary text-primary-foreground [&_svg]:size-2"
                initial={from(play, { scale: 0 })}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 1.2 }}
              >
                <CheckIcon strokeWidth={4} />
              </motion.span>
            )}
          </span>
          <span className="relative h-1.5 rounded-full bg-foreground/20" style={{ width }}>
            {n === done && (
              <motion.span
                className="absolute inset-x-0 top-1/2 h-px origin-left bg-foreground/50"
                initial={from(play, { scaleX: 0 })}
                animate={{ scaleX: 1 }}
                transition={at(1.3, 0.3)}
              />
            )}
          </span>
          <span className={cn('ml-auto h-3 w-8 rounded-full', n === 0 ? 'bg-primary/20' : 'bg-foreground/10')} />
        </motion.div>
      ))}
      <motion.span
        className="absolute right-3 bottom-2 flex items-center gap-1 rounded-lg bg-foreground px-2 py-1 text-[8.5px] font-semibold text-background [&_svg]:size-3"
        initial={from(play, { opacity: 0, y: 10, scale: 0.9 })}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 1.95 }}
      >
        <Icon />
        {t('home.demo.saved')}
      </motion.span>
      <Cursor x={24} y={49} press={1.15} play={play} />
    </div>
  )
}

type SceneKind = 'transform' | 'inspect' | 'visual' | 'generate' | 'shield' | 'organize'

const SCENES: Record<string, SceneKind> = {
  clipboard: 'organize',
  text: 'transform',
  developer: 'transform',
  data: 'transform',
  qa: 'inspect',
  api: 'inspect',
  web: 'inspect',
  seo: 'inspect',
  accessibility: 'inspect',
  storage: 'inspect',
  sites: 'inspect',
  design: 'visual',
  image: 'visual',
  screenshots: 'visual',
  generators: 'generate',
  calculators: 'generate',
  datetime: 'generate',
  security: 'shield',
  privacy: 'shield',
  productivity: 'organize',
  files: 'organize',
  browser: 'organize',
}

/** The animated stage for one tool, styled after what its category does. */
export function CategoryScene({ categoryId, tool, play }: { categoryId: string; tool: ToolDefinition; play: boolean }) {
  const seed = seedOf(tool.id)
  switch (SCENES[categoryId]) {
    case 'inspect':
      return <InspectScene tool={tool} play={play} seed={seed} />
    case 'visual':
      return <VisualScene tool={tool} play={play} seed={seed} />
    case 'generate':
      return <GenerateScene tool={tool} play={play} seed={seed} />
    case 'shield':
      return <ShieldScene tool={tool} play={play} seed={seed} />
    case 'organize':
      return <OrganizeScene tool={tool} play={play} seed={seed} />
    default:
      return <TransformScene tool={tool} play={play} seed={seed} />
  }
}
