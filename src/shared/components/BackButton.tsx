import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getReturnRoute } from '@/app/navigationHistory'
import { Link, useRouter } from '@/app/router'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

/** Returns to the page this one was opened from; `to` is used when there is none, such as a deep link. */
export function BackButton({ to = '/', className }: { to?: string; className?: string }) {
  const { t } = useTranslation()
  const { path } = useRouter()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className={cn(
            'group size-8 shrink-0 rounded-full border border-border bg-background text-muted-foreground transition-[background-color,border-color,color,transform] duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95',
            className,
          )}
        >
          <Link to={getReturnRoute(path, to)} aria-label={t('common.back')}>
            <ArrowLeftIcon className="transition-transform duration-200 group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{t('common.back')}</TooltipContent>
    </Tooltip>
  )
}