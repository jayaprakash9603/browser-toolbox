import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

export function BackButton({ to = '/', className }: { to?: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className={cn(
            'group shrink-0 rounded-full border border-border bg-background text-muted-foreground transition-[background-color,border-color,color,transform] duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95',
            className,
          )}
        >
          <Link to={to} aria-label={t('common.back')}>
            <ArrowLeftIcon className="transition-transform duration-200 group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{t('common.back')}</TooltipContent>
    </Tooltip>
  )
}