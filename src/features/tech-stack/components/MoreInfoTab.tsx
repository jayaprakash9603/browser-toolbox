import { CheckIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { hasResponseHeaders, httpVersionLabel, securityHeaderRows } from '@/core/engines/techStack/moreInfo'
import type { TechScan } from '@/core/engines/techStack/types'
import { cn } from '@/shared/utils/cn'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3 break-inside-avoid overflow-hidden rounded-xl border bg-card/60 shadow-xs">
      <h3 className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-tight text-foreground/90">{title}</h3>
      <div className="flex flex-col gap-1 px-3 py-2 text-[12px]">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{value}</span>
    </div>
  )
}

function StatusRow({ label, ok, okLabel, badLabel }: { label: string; ok: boolean; okLabel: string; badLabel: string }) {
  const Icon = ok ? CheckIcon : XIcon
  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden className={cn('size-3.5 shrink-0', ok ? 'text-emerald-500' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1 break-all">{label}</span>
      <span className="text-muted-foreground">{ok ? okLabel : badLabel}</span>
    </div>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-w-0 items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
    >
      <span className="min-w-0 break-all">{children}</span>
      <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
    </a>
  )
}

function OverviewSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const { facts } = scan
  return (
    <Section title={t('techStack.more.overview')}>
      <Row label={t('techStack.more.title')} value={facts.title} />
      <Row label={t('techStack.more.description')} value={facts.description} />
      <Row label={t('techStack.more.language')} value={facts.language} />
      <Row label={t('techStack.more.charset')} value={facts.charset} />
      <Row label={t('techStack.more.canonical')} value={facts.canonical} />
      <Row label={t('techStack.more.generator')} value={facts.generator} />
    </Section>
  )
}

function ConnectionSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const secure = scan.url.startsWith('https:')
  return (
    <Section title={t('techStack.more.connection')}>
      <Row label={t('techStack.more.protocol')} value={httpVersionLabel(scan.protocol) ?? ''} />
      <Row label={t('techStack.more.secure')} value={secure ? t('techStack.more.yes') : t('techStack.more.no')} />
      <Row label={t('techStack.more.server')} value={scan.headers.server ?? ''} />
      <Row label={t('techStack.more.poweredBy')} value={scan.headers['x-powered-by'] ?? ''} />
    </Section>
  )
}

function SecurityHeadersSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  return (
    <Section title={t('techStack.more.securityHeaders')}>
      {hasResponseHeaders(scan.headers) ? (
        securityHeaderRows(scan.headers).map(({ label, present }) => (
          <StatusRow
            key={label}
            label={label}
            ok={present}
            okLabel={t('techStack.more.headerPresent')}
            badLabel={t('techStack.more.headerMissing')}
          />
        ))
      ) : (
        <p className="text-muted-foreground">{t('techStack.more.headersUnavailable')}</p>
      )}
    </Section>
  )
}

function LinksSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const { social, emails, phones, feeds } = scan.facts
  return (
    <>
      {social.length > 0 && (
        <Section title={t('techStack.more.social')}>
          {social.map(({ network, url }) => (
            <div key={url} className="flex gap-3">
              <span className="w-24 shrink-0 text-muted-foreground">{network}</span>
              <ExternalLink href={url}>{url.replace(/^https?:\/\/(?:www\.)?/, '')}</ExternalLink>
            </div>
          ))}
        </Section>
      )}
      {(emails.length > 0 || phones.length > 0) && (
        <Section title={t('techStack.more.contact')}>
          <Row label={t('techStack.more.emails')} value={emails.join(', ')} />
          <Row label={t('techStack.more.phones')} value={phones.join(', ')} />
        </Section>
      )}
      {feeds.length > 0 && (
        <Section title={t('techStack.more.feeds')}>
          {feeds.map((feed) => (
            <ExternalLink key={feed} href={feed}>
              {feed}
            </ExternalLink>
          ))}
        </Section>
      )}
    </>
  )
}

function ContentSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const { counts } = scan.facts
  return (
    <Section title={t('techStack.more.content')}>
      <Row label={t('techStack.more.scripts')} value={String(counts.scripts)} />
      <Row label={t('techStack.more.stylesheets')} value={String(counts.stylesheets)} />
      <Row label={t('techStack.more.images')} value={String(counts.images)} />
      <Row label={t('techStack.more.links')} value={String(counts.links)} />
      <Row label={t('techStack.more.forms')} value={String(counts.forms)} />
      <Row label={t('techStack.more.iframes')} value={String(counts.iframes)} />
    </Section>
  )
}

export function MoreInfoTab({ scan }: { scan: TechScan }) {
  return (
    <div className="columns-1 gap-x-8 @[440px]:columns-2">
      <OverviewSection scan={scan} />
      <ConnectionSection scan={scan} />
      <SecurityHeadersSection scan={scan} />
      <LinksSection scan={scan} />
      <ContentSection scan={scan} />
    </div>
  )
}
