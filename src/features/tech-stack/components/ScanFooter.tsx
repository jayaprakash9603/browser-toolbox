import { ArrowUpRightIcon, DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { Button } from '@/shared/components/ui/button'

import { TECH_STACK_FEEDBACK_URL } from '../download'
import { TECH_STACK_ROUTE } from '../routes'
import { ScanSection } from './ScanSection'

interface ScanFooterProps {
  canExport: boolean
  showOpen: boolean
  onExport: () => void
  onNavigate?: () => void
}

export function ScanFooter({ canExport, showOpen, onExport, onNavigate }: ScanFooterProps) {
  const { t } = useTranslation()

  return (
    <ScanSection className="@container flex items-center gap-1 p-3">
      <a
        href={TECH_STACK_FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 truncate rounded px-1.5 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t('techStack.missing')}
      </a>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="ghost"
        className="h-8 shrink-0 gap-1 px-2 text-xs"
        aria-label={t('techStack.exportLabel')}
        disabled={!canExport}
        onClick={onExport}
      >
        <DownloadIcon className="size-3.5" />
        <span className="hidden @[19.75rem]:inline">{t('techStack.export')}</span>
      </Button>
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
