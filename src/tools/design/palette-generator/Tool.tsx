import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { MotionConfig, motion, useReducedMotion } from 'motion/react'
import { CodeXmlIcon, ContrastIcon, LayersIcon, LayoutTemplateIcon, LibraryBigIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { ModeTiles } from '@/shared/components/toolkit'
import { ToolPage } from '@/shared/components/ToolPage'
import { TabsContent } from '@/shared/components/ui/tabs'
import { useDeepLinkParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useDesignTool } from '../_shared'
import { ContrastPanel } from './ContrastPanel'
import { ExportPanel } from './ExportPanel'
import { HarmonyControls } from './HarmonyControls'
import { InspectPanel } from './InspectPanel'
import { EASE_OUT, useColorLabels } from './labels'
import { LibraryPanel } from './LibraryPanel'
import {
  DEFAULT_BASE,
  HARMONIES,
  MAX_COLORS,
  MIN_COLORS,
  applyHarmony,
  createSwatches,
  harmonyHexes,
  initialSwatches,
  loadSaved,
  loadSession,
  regenerate,
  storeSaved,
  storeSession,
  type Harmony,
  type SavedPalette,
  type Swatch,
} from './paletteModel'
import { PaletteStage } from './PaletteStage'
import { PreviewPanel } from './PreviewPanel'
import { ScalesPanel } from './ScalesPanel'
import { usePaletteHistory } from './usePaletteHistory'

const SECTIONS = ['inspect', 'scales', 'contrast', 'preview', 'export', 'library'] as const
type Section = (typeof SECTIONS)[number]

const SECTION_META = {
  inspect: { icon: SlidersHorizontalIcon, tone: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300' },
  scales: { icon: LayersIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300' },
  contrast: { icon: ContrastIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' },
  preview: { icon: LayoutTemplateIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-300' },
  export: { icon: CodeXmlIcon, tone: 'bg-amber-500/14 text-amber-700 dark:text-amber-300' },
  library: { icon: LibraryBigIcon, tone: 'bg-rose-500/12 text-rose-600 dark:text-rose-300' },
} as const

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

function isInteractive(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('button, a, [role="radio"], [role="tab"], [role="slider"], summary')
}

export default function PaletteGeneratorTool() {
  const tool = useDesignTool('design.palette-generator')
  const { t } = useTranslation()
  const labels = useColorLabels()
  const reduce = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const [harmony, setHarmony] = useDeepLinkParam<Harmony>('mode', HARMONIES, 'analogous')
  const [section, setSection] = useDeepLinkTab<Section>('tab', SECTIONS, 'inspect')
  const history = usePaletteHistory(() => loadSession() ?? { base: DEFAULT_BASE, swatches: initialSwatches(DEFAULT_BASE, harmony) })
  const { base, swatches } = history.present
  const [selectedId, setSelectedId] = useState(() => swatches[0].id)
  const [generation, setGeneration] = useState(0)
  const [saved, setSaved] = useState<SavedPalette[]>(loadSaved)
  const [appliedHarmony, setAppliedHarmony] = useState(harmony)
  const [visited, setVisited] = useState<ReadonlySet<Section>>(() => new Set([section]))
  if (!visited.has(section)) setVisited(new Set(visited).add(section))

  const selectedIndex = Math.max(0, swatches.findIndex((s) => s.id === selectedId))
  const selected = swatches[selectedIndex]

  const set = (next: Swatch[], nextBase = base, transient = false) => history.set({ base: nextBase, swatches: next }, transient)

  // Search results and bookmarks can switch the harmony while the tool is open.
  if (appliedHarmony !== harmony) {
    setAppliedHarmony(harmony)
    set(applyHarmony(swatches, base, harmony))
  }

  useEffect(() => storeSession(history.present), [history.present])

  const generate = () => {
    const next = regenerate(swatches, harmony)
    set(next.swatches, next.base)
    setGeneration((g) => g + 1)
  }

  const changeHarmony = (next: Harmony) => {
    setHarmony(next)
    setAppliedHarmony(next)
    set(applyHarmony(swatches, base, next))
    setGeneration((g) => g + 1)
  }

  const changeBase = (hex: string) => set(applyHarmony(swatches, hex, harmony), hex)

  const { search } = useRouter()
  const seedColor = new URLSearchParams(search).get('color')
  const applySeedColor = useEffectEvent((hex: string) => changeBase(hex))
  useEffect(() => {
    if (seedColor && /^#?[0-9a-f]{6}$/i.test(seedColor)) {
      applySeedColor(seedColor.startsWith('#') ? seedColor : `#${seedColor}`)
    }
  }, [seedColor])

  const toggleLock = (id: string) => set(swatches.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)))

  const remove = (id: string) => {
    if (swatches.length <= MIN_COLORS) return
    const index = swatches.findIndex((s) => s.id === id)
    const next = swatches.filter((s) => s.id !== id)
    set(next)
    if (id === selected.id) setSelectedId(next[Math.min(index, next.length - 1)].id)
  }

  const add = () => {
    if (swatches.length >= MAX_COLORS) return
    const taken = new Set(swatches.map((s) => s.hex))
    const hex = harmonyHexes(base, harmony, Math.random).find((candidate) => !taken.has(candidate)) ?? harmonyHexes(base, 'random', Math.random)[1]
    const [swatch] = createSwatches([hex])
    set([...swatches, swatch])
    setSelectedId(swatch.id)
  }

  const updateSelected = (hex: string, transient = false) =>
    set(
      swatches.map((s) => (s.id === selected.id ? { ...s, hex } : s)),
      base,
      transient,
    )

  const move = (direction: -1 | 1) => {
    const target = selectedIndex + direction
    if (target < 0 || target >= swatches.length) return
    const next = [...swatches]
    ;[next[selectedIndex], next[target]] = [next[target], next[selectedIndex]]
    set(next)
  }

  const fillFrom = (hexes: readonly string[]) => {
    let cursor = 0
    set(
      swatches.map((s) => (s.locked ? s : { ...s, hex: hexes[cursor++ % hexes.length] })),
      hexes[0],
    )
    setGeneration((g) => g + 1)
  }

  const applyLibrary = (colors: readonly string[]) => {
    const next = createSwatches([...colors])
    set(next, next[0].hex)
    setSelectedId(next[0].id)
    setGeneration((g) => g + 1)
    stageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const save = () => {
    const hexes = swatches.map((s) => s.hex)
    const entry: SavedPalette = {
      id: crypto.randomUUID(),
      name: t('pg.savedName', { first: labels.name(hexes[0]), second: labels.name(hexes[1]) }),
      colors: hexes,
      createdAt: Date.now(),
    }
    const next = [entry, ...saved.filter((item) => item.colors.join() !== hexes.join())]
    setSaved(next)
    storeSaved(next)
  }

  const deleteSaved = (id: string) => {
    const next = saved.filter((item) => item.id !== id)
    setSaved(next)
    storeSaved(next)
  }

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyHandler.current = (event) => {
      if (event.defaultPrevented || isEditable(event.target) || event.altKey) return
      const mod = event.ctrlKey || event.metaKey
      if (event.code === 'Space' && !mod && !isInteractive(event.target)) {
        event.preventDefault()
        generate()
      } else if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) history.redo()
        else history.undo()
      } else if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        history.redo()
      }
    }
  })
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
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
    <ToolPage tool={tool}>
      <MotionConfig reducedMotion="user">
        <div className="flex flex-col gap-3 @container">
          <div ref={stageRef} className="scroll-mt-3">
            <PaletteStage
              swatches={swatches}
              selectedId={selected.id}
              generation={generation}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onSelect={setSelectedId}
              onToggleLock={toggleLock}
              onRemove={remove}
              onReorder={(next) => set(next, base, true)}
              onReorderEnd={history.commit}
              onGenerate={generate}
              onUndo={history.undo}
              onRedo={history.redo}
              onAdd={add}
              onSave={save}
            />
            <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground">{t('pg.shortcuts')}</p>
          </div>

          <HarmonyControls
            base={base}
            harmony={harmony}
            swatches={swatches}
            onBaseChange={changeBase}
            onHarmonyChange={changeHarmony}
            onExtracted={fillFrom}
          />

          <TabsPrimitive.Root value={section} onValueChange={(value) => setSection(value as Section)} className="flex flex-col gap-3">
            <ModeTiles
              label={t('pg.sections.label')}
              layoutId="palette-generator-section"
              value={section}
              tiles={SECTIONS.map((value) => ({
                value,
                label: t(`pg.sections.${value}`),
                hint: t(`pg.sections.${value}Hint`),
                icon: SECTION_META[value].icon,
                tone: SECTION_META[value].tone,
              }))}
            />
            {panel(
              'inspect',
              <InspectPanel
                swatch={selected}
                index={selectedIndex}
                count={swatches.length}
                onChange={updateSelected}
                onCommit={history.commit}
                onMove={move}
                onToggleLock={() => toggleLock(selected.id)}
              />,
            )}
            {panel('scales', <ScalesPanel swatches={swatches} />)}
            {panel('contrast', <ContrastPanel swatches={swatches} />)}
            {panel('preview', <PreviewPanel swatches={swatches} />)}
            {panel('export', <ExportPanel swatches={swatches} />)}
            {panel('library', <LibraryPanel saved={saved} onApply={applyLibrary} onDelete={deleteSaved} />)}
          </TabsPrimitive.Root>
        </div>
      </MotionConfig>
    </ToolPage>
  )
}
