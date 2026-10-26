import { useCallback, useState, type ReactNode } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { MotionConfig, motion } from 'motion/react'
import { FlaskConicalIcon, FolderDownIcon, ListOrderedIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSaveImageAsSettings } from '@/features/image/useSaveImageAsSettings'
import { ModeTiles } from '@/shared/components/toolkit'
import { ToolPage } from '@/shared/components/ToolPage'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Switch } from '@/shared/components/ui/switch'
import { TabsContent } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import { useImageTool } from '../_shared'
import { EASE_OUT } from './formatMeta'
import { FormatList } from './FormatList'
import { OutputPanel } from './OutputPanel'
import { SavingPanel } from './SavingPanel'
import { StatusBar } from './StatusBar'
import { TryItPanel } from './TryItPanel'

const SECTIONS = ['menu', 'output', 'saving', 'try'] as const
type Section = (typeof SECTIONS)[number]

const SECTION_META = {
  menu: { icon: ListOrderedIcon, tone: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300' },
  output: { icon: SlidersHorizontalIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300' },
  saving: { icon: FolderDownIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' },
  try: { icon: FlaskConicalIcon, tone: 'bg-amber-500/14 text-amber-700 dark:text-amber-300' },
} as const

const DETAILS_KEY = 'tbx.save-image-as.details'

function readDetailsOpen(): boolean {
  try {
    return localStorage.getItem(DETAILS_KEY) === '1'
  } catch {
    return false
  }
}

export default function SaveImageAsTypeTool() {
  const { t } = useTranslation()
  const tool = useImageTool('image.save-as-type')
  const { state, patch, toggleFormat } = useSaveImageAsSettings()
  const [section, setSection] = useDeepLinkTab<Section>('tab', SECTIONS, 'menu')
  const [visited, setVisited] = useState<ReadonlySet<Section>>(() => new Set([section]))
  const [detailsOpen, setDetailsOpen] = useState(readDetailsOpen)
  if (!visited.has(section)) setVisited(new Set(visited).add(section))

  const changeDetails = useCallback((open: boolean) => {
    setDetailsOpen(open)
    try {
      localStorage.setItem(DETAILS_KEY, open ? '1' : '0')
    } catch {
      /* preference only */
    }
  }, [])

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
      contentClassName={cn('flex min-h-0 flex-col gap-3 @container')}
      actions={
        state && (
          <Switch checked={state.enabled} onCheckedChange={(on) => void patch({ enabled: on })} aria-label={t('saveImageAs.enabled')} />
        )
      }
    >
      <MotionConfig reducedMotion="user">
        {!state ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <>
            <StatusBar
              state={state}
              open={detailsOpen}
              onOpenChange={changeDetails}
              onEnable={() => void patch({ enabled: true })}
            />
            <TabsPrimitive.Root value={section} onValueChange={(value) => setSection(value as Section)} className="flex min-h-0 flex-1 flex-col gap-3">
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
          </>
        )}
      </MotionConfig>
    </ToolPage>
  )
}
