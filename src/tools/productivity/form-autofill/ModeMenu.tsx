import { useTranslation } from 'react-i18next'
import { CheckIcon, EyeIcon, ShieldCheckIcon, SparklesIcon, type LucideIcon } from 'lucide-react'
import type { AutofillController } from '@universal-form-autofill/sdk'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { AUTOFILL_MODE_IDS, type AutofillModeId } from './modes'

const MODE_ICON: Record<AutofillModeId, LucideIcon> = {
  suggest: EyeIcon,
  review: SparklesIcon,
  trusted: ShieldCheckIcon,
}

interface ModeMenuProps {
  controller: AutofillController | null
  mode: AutofillModeId
}

/** Picks how autofill behaves, from the connection bar instead of a permanent strip on the page. */
export function ModeMenu({ controller, mode }: ModeMenuProps) {
  const { t } = useTranslation()
  const Icon = MODE_ICON[mode]

  const choose = (next: AutofillModeId) => {
    if (next === mode) return
    void controller?.store.settings.update({ mode: next })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!controller}
          aria-label={t('autofill.mode.change', { mode: t(`autofill.mode.${mode}`) })}
          title={t('autofill.mode.change', { mode: t(`autofill.mode.${mode}`) })}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 data-[state=open]:bg-accent data-[state=open]:text-foreground"
        >
          <Icon className="size-4" aria-hidden />
          <span className="hidden text-[11px] font-medium @[360px]:inline">{t(`autofill.mode.${mode}`)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          {t('autofill.mode.label')}
        </DropdownMenuLabel>
        {AUTOFILL_MODE_IDS.map((id) => {
          const ItemIcon = MODE_ICON[id]
          return (
            <DropdownMenuItem key={id} onSelect={() => choose(id)} className="items-start gap-2.5 py-2">
              <ItemIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-medium">{t(`autofill.mode.${id}`)}</span>
                <span className="text-[11px] leading-4 text-muted-foreground">{t(`autofill.mode.${id}Hint`)}</span>
              </span>
              <CheckIcon className={cn('mt-0.5 size-4 shrink-0 text-primary', id === mode ? 'opacity-100' : 'opacity-0')} aria-hidden />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
