import {
  ArrowRightLeftIcon,
  EyeIcon,
  FileArchiveIcon,
  FilePenLineIcon,
  ImagesIcon,
  ScanSearchIcon,
  type LucideIcon,
} from 'lucide-react'

import { familyOf, type FileFamily } from '@/core/engines/files/kinds'

export const MODES = ['convert', 'write', 'pdf', 'archive', 'inspect', 'view'] as const
export type Mode = (typeof MODES)[number]

interface ModeMeta {
  icon: LucideIcon
  tone: string
  /** Source and result labels drawn in the hero. */
  pair: readonly [string, string]
}

export const MODE_META: Record<Mode, ModeMeta> = {
  convert: { icon: ArrowRightLeftIcon, tone: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300', pair: ['CSV', 'XLSX'] },
  write: { icon: FilePenLineIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300', pair: ['TXT', 'DOCX'] },
  pdf: { icon: ImagesIcon, tone: 'bg-rose-500/12 text-rose-600 dark:text-rose-300', pair: ['JPG', 'PDF'] },
  archive: { icon: FileArchiveIcon, tone: 'bg-amber-500/14 text-amber-700 dark:text-amber-300', pair: ['FILE', 'ZIP'] },
  inspect: { icon: ScanSearchIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300', pair: ['BIN', 'SHA'] },
  view: { icon: EyeIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-300', pair: ['JSON', 'VIEW'] },
}

export interface QueueItem {
  id: string
  file: File
  family: FileFamily
}

export function toQueueItems(files: File[]): QueueItem[] {
  return files.map((file) => ({ id: crypto.randomUUID(), file, family: familyOf(file) }))
}
