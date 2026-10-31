import { BugIcon, MailIcon, StarIcon } from 'lucide-react'
import { lazy, Suspense, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { FEEDBACK_SUBJECT, STORE_LISTING_URL, buildMailtoUrl } from '@/core/support/config'
import { FadeIn } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

const ReportIssueDialog = lazy(() =>
  import('@/features/support/ReportIssueDialog').then((m) => ({ default: m.ReportIssueDialog })),
)

const ACTION_CLASS =
  'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border bg-card px-2.5 py-2 text-xs font-medium outline-none transition-colors hover:border-primary/35 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring'

function ActionIcon({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  return <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
}

export function SupportCard({ delay = 0.4 }: { delay?: number }) {
  const { t } = useTranslation()
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <FadeIn delay={delay} className="mb-2">
      <section aria-label={t('support.title', { defaultValue: 'Help and feedback' })}>
        <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">
          {t('support.title', { defaultValue: 'Help and feedback' })}
        </h2>
        <div className="flex flex-col gap-2 @[360px]:flex-row">
          <button type="button" className={cn(ACTION_CLASS)} onClick={() => setReportOpen(true)}>
            <ActionIcon icon={BugIcon} />
            {t('support.report.action', { defaultValue: 'Report an Issue' })}
          </button>
          <a className={ACTION_CLASS} href={buildMailtoUrl(FEEDBACK_SUBJECT)}>
            <ActionIcon icon={MailIcon} />
            {t('support.email', { defaultValue: 'Email Us' })}
          </a>
          <a className={ACTION_CLASS} href={STORE_LISTING_URL} target="_blank" rel="noopener noreferrer">
            <ActionIcon icon={StarIcon} />
            {t('support.rate', { defaultValue: 'Rate One Panel' })}
          </a>
        </div>
      </section>
      {reportOpen && (
        <Suspense fallback={null}>
          <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
        </Suspense>
      )}
    </FadeIn>
  )
}
