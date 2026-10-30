import { ArrowUpRightIcon, ChevronDownIcon, DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

import { TECH_STACK_ROUTE } from '../routes'
import { ScanSection } from './ScanSection'
import { cn } from '@/shared/utils/cn'

interface ScanFooterProps {
  canExport: boolean
  showOpen: boolean
  onExportCsv: () => void
  onExportJson: () => void
  onNavigate?: () => void
  inPopover?: boolean
}

export function ScanFooter({
  canExport,
  showOpen,
  onExportCsv,
  onExportJson,
  onNavigate,
  inPopover = false,
}: ScanFooterProps) {
  const { t } = useTranslation()

  return (
    <ScanSection
      instant
      className={cn(
        '@container relative z-10 flex shrink-0 items-center gap-1 border-t border-border/80 p-3',
        inPopover ? 'bg-popover' : 'bg-background/95 backdrop-blur-md',
      )}
    >
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 gap-1 px-2 text-xs"
            aria-label={t('techStack.exportLabel')}
            disabled={!canExport}
          >
            <DownloadIcon className="size-3.5" />
            <span className="hidden @[19.75rem]:inline">{t('techStack.export')}</span>
            <ChevronDownIcon className="size-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[110] w-36">
          <DropdownMenuItem onSelect={onExportCsv} aria-label={t('techStack.exportCsvLabel')}>
            {t('techStack.exportCsv')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportJson} aria-label={t('techStack.exportJsonLabel')}>
            {t('techStack.exportJson')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showOpen && (
        <Button asChild size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs @[19.75rem]:px-2.5">
          <Link to={TECH_STACK_ROUTE} onClick={onNavigate} aria-label={t('techStack.popover.open')}>
            <span className="hidden @[19.75rem]:inline">{t('techStack.popover.open')}</span>
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Button>
      )}
    </ScanSection>
  )
}
