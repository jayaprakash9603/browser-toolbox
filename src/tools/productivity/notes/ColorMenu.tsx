import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { NOTE_COLOR_STYLES } from './noteColors'
import { NOTE_COLORS, type NoteColor } from './notesService'

export function ColorSwatch({ color, className, children }: { color: NoteColor; className?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-foreground/15',
        NOTE_COLOR_STYLES[color].swatch,
        className,
      )}
    >
      {children}
    </span>
  )
}

interface ColorMenuProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
  /** The trigger button (rendered with `asChild`). */
  children: ReactNode
  align?: 'start' | 'end'
}

export function ColorMenu({ value, onChange, children, align = 'end' }: ColorMenuProps) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-0">
        <DropdownMenuLabel>{t('notes.color')}</DropdownMenuLabel>
        <div className="grid grid-cols-4 gap-1 p-1">
          {NOTE_COLORS.map((color) => (
            <DropdownMenuItem
              key={color}
              aria-label={t(`notes.colors.${color}`)}
              title={t(`notes.colors.${color}`)}
              onSelect={() => onChange(color)}
              className="justify-center p-1"
            >
              <ColorSwatch color={color} className="size-6 transition-transform duration-150 hover:scale-110">
                {value === color && (
                  <CheckIcon className={cn('size-3.5', color === 'charcoal' ? 'text-white' : 'text-foreground')} />
                )}
              </ColorSwatch>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
