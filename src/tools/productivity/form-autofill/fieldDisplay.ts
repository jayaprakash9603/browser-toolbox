import {
  AlignLeftIcon,
  ChevronsUpDownIcon,
  CircleDotIcon,
  ListChecksIcon,
  SquareCheckIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react'

import type { MemoryFieldKind, MemoryValue } from '@/core/form-memory/model'

export const KIND_ICON: Record<MemoryFieldKind, LucideIcon> = {
  text: TypeIcon,
  textarea: AlignLeftIcon,
  select: ChevronsUpDownIcon,
  multi: ListChecksIcon,
  checkbox: SquareCheckIcon,
  radio: CircleDotIcon,
}

/** Readable text for a stored value; checkboxes have none and are shown as a toggle instead. */
export function valueText({ value, display }: { value: MemoryValue; display?: string }): string {
  if (Array.isArray(value)) return display || value.join(', ')
  if (typeof value === 'boolean') return ''
  return display || value
}

export function valueKey(value: MemoryValue): string {
  return JSON.stringify(value)
}
