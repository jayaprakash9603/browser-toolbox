import { BugIcon, CheckIcon, MailIcon, SendIcon, SparklesIcon, StarIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Link, useRouter } from '@/app/router'
import { useInViewport, usePageVisible } from '@/app/pages/home/useDemoCycle'
import { FEEDBACK_SUBJECT, buildMailtoUrl, storeListingUrl } from '@/core/support/config'
import { FadeIn } from '@/shared/components/motion'
import './support-card.css'

type SupportAction = 'report' | 'email' | 'rate'

function ActionContent({
  action,
  title,
  description,
  id,
}: {
  action: SupportAction
  title: string
  description: string
  id: string
}) {
  return (
    <>
      <span className="support-action-demo" aria-hidden="true">
        <span className="support-demo-halo" />
        {action === 'report' && (
          <span className="support-demo-report">
            <BugIcon className="support-demo-bug" />
            <span className="support-demo-line" />
            <span className="support-demo-line support-demo-line-short" />
            <span className="support-demo-check">
              <CheckIcon />
            </span>
          </span>
        )}
        {action === 'email' && (
          <span className="support-demo-email">
            <span className="support-demo-letter">
              <span className="support-demo-line" />
              <span className="support-demo-line support-demo-line-short" />
            </span>
            <MailIcon className="support-demo-envelope" strokeWidth={1.4} />
            <SendIcon className="support-demo-send" />
          </span>
        )}
        {action === 'rate' && (
          <span className="support-demo-rating">
            <SparklesIcon className="support-demo-sparkle" />
            <span className="support-demo-stars">
              {Array.from({ length: 5 }, (_, index) => (
                <StarIcon key={index} />
              ))}
            </span>
          </span>
        )}
      </span>
      <span className="support-action-copy">
        <span className="support-action-title" id={`${id}-title`}>
          {title}
        </span>
        <span className="support-action-description" id={`${id}-description`}>
          {description}
        </span>
      </span>
    </>
  )
}

export function SupportCard({ delay = 0.4 }: { delay?: number }) {
  const { t } = useTranslation()
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const inViewport = useInViewport(ref)
  const pageVisible = usePageVisible()
  const reduce = useReducedMotion()
  const { path, search } = useRouter()
  const reportRoute = `/report-issue?from=${encodeURIComponent(`${path}${search}`)}`

  return (
    <FadeIn delay={delay} className="mb-2">
      <section
        ref={ref}
        className="support-section"
        aria-labelledby={`${id}-heading`}
        data-motion={inViewport && pageVisible && !reduce ? 'active' : 'off'}
      >
        <h2 id={`${id}-heading`} className="support-heading">
          {t('support.title', { defaultValue: 'Help and feedback' })}
        </h2>
        <div className="support-actions">
          <Link
            to={reportRoute}
            className="support-action support-action-report"
            aria-labelledby={`${id}-report-title`}
            aria-describedby={`${id}-report-description`}
          >
            <ActionContent
              action="report"
              id={`${id}-report`}
              title={t('support.report.action', { defaultValue: 'Report an Issue' })}
              description={t('support.report.cardHint', {
                defaultValue: 'Found a bug? Help us make it better.',
              })}
            />
          </Link>
          <a
            className="support-action support-action-email"
            href={buildMailtoUrl(FEEDBACK_SUBJECT)}
            aria-labelledby={`${id}-email-title`}
            aria-describedby={`${id}-email-description`}
          >
            <ActionContent
              action="email"
              id={`${id}-email`}
              title={t('support.email', { defaultValue: 'Email Us' })}
              description={t('support.emailHint', {
                defaultValue: 'Ideas or questions? Open an email draft.',
              })}
            />
          </a>
          <a
            className="support-action support-action-rate"
            href={storeListingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-labelledby={`${id}-rate-title`}
            aria-describedby={`${id}-rate-description`}
          >
            <ActionContent
              action="rate"
              id={`${id}-rate`}
              title={t('support.rate', { defaultValue: 'Rate One Panel' })}
              description={t('support.rateHint', {
                defaultValue: 'Enjoying One Panel? Review it in the store.',
              })}
            />
          </a>
        </div>
      </section>
    </FadeIn>
  )
}
