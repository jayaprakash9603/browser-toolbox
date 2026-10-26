import { useState, type ReactNode } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { FlaskConicalIcon, FolderDownIcon, ListOrderedIcon, MousePointerClickIcon, ShieldCheckIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { type SaveImageAsState } from '@/core/imageConvert'
import { useSaveImageAsSettings } from '@/features/image/useSaveImageAsSettings'
import { ModeTiles } from '@/shared/components/toolkit'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Switch } from '@/shared/components/ui/switch'
import { TabsContent } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import { useImageTool } from '../_shared'
import { EASE_OUT } from './formatMeta'
import { FormatList } from './FormatList'
import { MenuPreview } from './MenuPreview'
import { OutputPanel } from './OutputPanel'
import { SavingPanel } from './SavingPanel'
import { TryItPanel } from './TryItPanel'

const SECTIONS = ['menu', 'output', 'saving', 'try'] as const
type Section = (typeof SECTIONS)[number]

const SECTION_META = {
  menu: { icon: ListOrderedIcon, tone: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300' },
  output: { icon: SlidersHorizontalIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300' },
  saving: { icon: FolderDownIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' },
  try: { icon: FlaskConicalIcon, tone: 'bg-amber-500/14 text-amber-700 dark:text-amber-300' },
} as const

export default function SaveImageAsTypeTool() {
  const { t } = useTranslation()
  const tool = useImageTool('image.save-as-type')
  const { state, patch, toggleFormat } = useSaveImageAsSettings()
  const [section, setSection] = useDeepLinkTab<Section>('tab', SECTIONS, 'menu')
  const [visited, setVisited] = useState<ReadonlySet<Section>>(() => new Set([section]))
  if (!visited.has(section)) setVisited(new Set(visited).add(section))

  const panel = (value: Section, content: ReactNode) => (
    <TabsContent value={value} forceMount className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
      {visited.has(value) && (
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={section === value ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {content}
        </motion.div>
      )}
    </TabsContent>
  )

  return (
    <ToolPage
      tool={tool}
      actions={
        state && (
          <Switch checked={state.enabled} onCheckedChange={(on) => void patch({ enabled: on })} aria-label={t('saveImageAs.enabled')} />
        )
      }
    >
      <MotionConfig reducedMotion="user">
        {!state ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-3 @container">
            <StatusHero state={state} onEnable={() => void patch({ enabled: true })} />
            <TabsPrimitive.Root value={section} onValueChange={(value) => setSection(value as Section)} className="flex flex-col gap-3">
              <ModeTiles
                label={t('sia.sections.label')}
                layoutId="save-image-as-section"
                value={section}
                className="grid grid-cols-2 gap-1.5 @[560px]:grid-cols-4"
                hintClassName="hidden @[400px]:block"
                tiles={SECTIONS.map((value) => ({
                  value,
                  label: t(`sia.sections.${value}`),
                  hint: t(`sia.sections.${value}Hint`),
                  icon: SECTION_META[value].icon,
                  tone: SECTION_META[value].tone,
                }))}
              />
              {panel(
                'menu',
                <FormatList
                  state={state}
                  onToggle={(format, on) => void toggleFormat(format, on)}
                  onReorder={(formats) => void patch({ formats })}
                  onQuick={(quickFormat) => void patch({ quickFormat })}
                />,
              )}
              {panel('output', <OutputPanel state={state} patch={patch} />)}
              {panel('saving', <SavingPanel state={state} patch={patch} />)}
              {panel('try', <TryItPanel state={state} />)}
            </TabsPrimitive.Root>
          </div>
        )}
      </MotionConfig>
    </ToolPage>
  )
}

function StatusHero({ state, onEnable }: { state: SaveImageAsState; onEnable: () => void }) {
  const { t } = useTranslation()
  const chips = [
    t('sia.hero.formats', { count: state.formats.length }),
    t('sia.hero.quality', { value: Math.round(state.quality * 100) }),
    state.maxSize ? t('sia.hero.maxSize', { value: state.maxSize }) : t('sia.size.original'),
    state.folder ? `Downloads/${state.folder}` : 'Downloads',
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="relative overflow-hidden rounded-2xl border bg-card p-3 shadow-xs @[480px]:p-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_70%)] opacity-[0.12]"
      />
      <div className="relative grid items-center gap-4 @[560px]:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <span
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
              state.enabled ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
            )}
          >
            <span className="relative flex size-1.5">
              {state.enabled && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />}
              <span className={cn('relative inline-flex size-1.5 rounded-full', state.enabled ? 'bg-emerald-500' : 'bg-amber-500')} />
            </span>
            {t(state.enabled ? 'sia.hero.active' : 'sia.hero.paused')}
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight tracking-tight">{t('sia.hero.title')}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('sia.hero.body')}</p>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label={t('sia.hero.summary')}>
            <AnimatePresence initial={false} mode="popLayout">
              {chips.map((chip, index) => (
                <motion.li
                  key={`${index}-${chip}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-full truncate rounded-md border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
                >
                  {chip}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MousePointerClickIcon className="size-3" aria-hidden />
              {t('sia.hero.how')}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {t('sia.hero.local')}
            </span>
          </div>
          <AnimatePresence initial={false}>
            {!state.enabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Button size="sm" onClick={onEnable}>
                  {t('sia.hero.enable')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <MenuPreview state={state} />
      </div>
    </motion.section>
  )
}
