import {
  CropIcon,
  LayersIcon,
  MonitorIcon,
  PanelTopOpenIcon,
  SquareDashedMousePointerIcon,
  UnfoldVerticalIcon,
  type LucideIcon,
} from 'lucide-react'

import type { ScreenshotMode } from '@/core/screenshot/types'

/** A tile in the launcher: a capture mode, or the on-page capture menu. */
export type LauncherMode = Exclude<ScreenshotMode, 'batch-urls'> | 'menu'

export interface LauncherModeMeta {
  id: LauncherMode
  icon: LucideIcon
  /** Background and text classes for the icon chip. */
  tone: string
  labelKey: string
  hintKey: string
  /** Keyboard command that runs this mode, when there is one. */
  command?: string
}

export const LAUNCHER_MODES: readonly LauncherModeMeta[] = [
  {
    id: 'entire',
    icon: UnfoldVerticalIcon,
    tone: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300',
    labelKey: 'capture.launcher.entire',
    hintKey: 'capture.launcher.entireHint',
    command: 'capture-entire',
  },
  {
    id: 'visible',
    icon: MonitorIcon,
    tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300',
    labelKey: 'capture.launcher.visible',
    hintKey: 'capture.launcher.visibleHint',
    command: 'capture-visible',
  },
  {
    id: 'selection',
    icon: CropIcon,
    tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
    labelKey: 'capture.launcher.selection',
    hintKey: 'capture.launcher.selectionHint',
    command: 'capture-selection',
  },
  {
    id: 'element',
    icon: SquareDashedMousePointerIcon,
    tone: 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
    labelKey: 'capture.launcher.element',
    hintKey: 'capture.launcher.elementHint',
    command: 'capture-element',
  },
  {
    id: 'all-tabs',
    icon: LayersIcon,
    tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
    labelKey: 'capture.launcher.allTabs',
    hintKey: 'capture.launcher.allTabsHint',
  },
  {
    id: 'menu',
    icon: PanelTopOpenIcon,
    tone: 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
    labelKey: 'capture.launcher.menu',
    hintKey: 'capture.launcher.menuHint',
    command: 'capture-menu',
  },
]

/** The on-page menu and URL lists don't capture the current view, so they skip the countdown. */
export function usesCountdown(mode: LauncherMode | 'batch-urls'): boolean {
  return mode !== 'menu' && mode !== 'batch-urls'
}
