import {
  BookOpenIcon,
  CombineIcon,
  FileImageIcon,
  LayoutGridIcon,
  LockKeyholeIcon,
  Minimize2Icon,
  ScissorsIcon,
  SignatureIcon,
  StampIcon,
  type LucideIcon,
} from 'lucide-react'

export const MODES = ['view', 'organize', 'merge', 'split', 'compress', 'sign', 'stamp', 'convert', 'protect'] as const
export type Mode = (typeof MODES)[number]

interface ModeMeta {
  icon: LucideIcon
  tone: string
  /** Source and result labels drawn in the hero. */
  pair: readonly [string, string]
}

export const MODE_META: Record<Mode, ModeMeta> = {
  view: { icon: BookOpenIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300', pair: ['PDF', 'VIEW'] },
  organize: { icon: LayoutGridIcon, tone: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300', pair: ['PDF', 'PDF'] },
  merge: { icon: CombineIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-300', pair: ['JPG', 'PDF'] },
  split: { icon: ScissorsIcon, tone: 'bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300', pair: ['PDF', 'ZIP'] },
  compress: { icon: Minimize2Icon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300', pair: ['PDF', 'MIN'] },
  sign: { icon: SignatureIcon, tone: 'bg-rose-500/12 text-rose-600 dark:text-rose-300', pair: ['PDF', 'SIGN'] },
  stamp: { icon: StampIcon, tone: 'bg-amber-500/14 text-amber-700 dark:text-amber-300', pair: ['PDF', 'PDF'] },
  convert: { icon: FileImageIcon, tone: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-300', pair: ['PDF', 'PNG'] },
  protect: { icon: LockKeyholeIcon, tone: 'bg-slate-500/14 text-slate-700 dark:text-slate-300', pair: ['PDF', 'LOCK'] },
}

export const THUMB_GRID = 'grid grid-cols-2 gap-3 @[420px]:grid-cols-3 @[640px]:grid-cols-4 @[880px]:grid-cols-5 @[1100px]:grid-cols-6'

/** One tray shape for every thumbnail, so portrait, landscape and turned pages keep the grid aligned. */
export const THUMB_TRAY = 'relative flex aspect-[4/5] items-center justify-center rounded-lg bg-muted/50 p-2'

/** Fits a page with this width-to-height ratio inside `THUMB_TRAY`. */
export function trayFit(ratio: number): string {
  return ratio <= 4 / 5 ? 'h-full w-auto max-w-full' : 'h-auto w-full max-h-full'
}

/** Modes that work without an open document. */
export const STANDALONE_MODES: ReadonlySet<Mode> = new Set(['merge'])
