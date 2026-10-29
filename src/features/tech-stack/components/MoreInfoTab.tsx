import { CheckIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { hasResponseHeaders, httpVersionLabel, securityHeaderRows } from '@/core/engines/techStack/moreInfo'
import type { TechScan } from '@/core/engines/techStack/types'

import { mixTint } from '../categoryStyle'

function InfoCard({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <section className="mb-2 break-inside-avoid overflow-hidden rounded-xl border bg-card">
      <h3
        className="px-3 py-2 text-[11px] font-medium tracking-wide uppercase"
        style={{ color, background: `linear-gradient(90deg, ${mixTint(color, 16)}, transparent 72%)` }}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-1.5 px-3 py-2 text-[12px]">{children}</div>
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
  const color = ok ? 'var(--success)' : 'var(--muted-foreground)'
  const Icon = ok ? CheckIcon : XIcon
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-md"
        style={{ color, backgroundColor: mixTint(color) }}
      >
        <Icon className="size-3" />
      </span>
      <span className="min-w-0 flex-1 break-all">{label}</span>
      <span className="text-[11px] text-muted-foreground">{ok ? okLabel : badLabel}</span>
    </div>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
    >
      <span className="min-w-0 break-all">{children}</span>
      <ExternalLinkIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
    </a>
  )
}

function StatGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border/70 rounded-xl border bg-muted/30 text-center">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-1.5 py-2">
          <p className="truncate font-mono text-[13px] font-semibold tabular-nums">{item.value}</p>
          <p className="truncate text-[10px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

function OverviewSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const { facts } = scan
  return (
    <InfoCard title={t('techStack.more.overview')} color="var(--hero-from)">
      <Row label={t('techStack.more.title')} value={facts.title} />
      <Row label={t('techStack.more.description')} value={facts.description} />
      <Row label={t('techStack.more.language')} value={facts.language} />
      <Row label={t('techStack.more.charset')} value={facts.charset} />
      <Row label={t('techStack.more.canonical')} value={facts.canonical} />
      <Row label={t('techStack.more.generator')} value={facts.generator} />
    </InfoCard>
  )
}

function ConnectionSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const secure = scan.url.startsWith('https:')
  return (
    <InfoCard title={t('techStack.more.connection')} color="var(--speed-down)">
      <Row label={t('techStack.more.protocol')} value={httpVersionLabel(scan.protocol) ?? ''} />
      <Row label={t('techStack.more.secure')} value={secure ? t('techStack.more.yes') : t('techStack.more.no')} />
      <Row label={t('techStack.more.server')} value={scan.headers.server ?? ''} />
      <Row label={t('techStack.more.poweredBy')} value={scan.headers['x-powered-by'] ?? ''} />
    </InfoCard>
  )
}

function SecurityHeadersSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  return (
    <InfoCard title={t('techStack.more.securityHeaders')} color="var(--success)">
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
    </InfoCard>
  )
}

function LinksSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const { social, emails, phones, feeds } = scan.facts
  return (
    <>
      {social.length > 0 && (
        <InfoCard title={t('techStack.more.social')} color="var(--speed-up)">
          {social.map(({ network, url }) => (
            <div key={url} className="flex gap-3">
              <span className="w-24 shrink-0 text-muted-foreground">{network}</span>
              <ExternalLink href={url}>{url.replace(/^https?:\/\/(?:www\.)?/, '')}</ExternalLink>
            </div>
          ))}
        </InfoCard>
      )}
      {(emails.length > 0 || phones.length > 0) && (
        <InfoCard title={t('techStack.more.contact')} color="var(--accent-brand)">
          <Row label={t('techStack.more.emails')} value={emails.join(', ')} />
          <Row label={t('techStack.more.phones')} value={phones.join(', ')} />
        </InfoCard>
      )}
      {feeds.length > 0 && (
        <InfoCard title={t('techStack.more.feeds')} color="var(--warning)">
          {feeds.map((feed) => (
            <ExternalLink key={feed} href={feed}>
              {feed}
            </ExternalLink>
          ))}
        </InfoCard>
      )}
    </>
  )
}

function ContentSection({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const { counts } = scan.facts
  return (
    <InfoCard title={t('techStack.more.content')} color="var(--netmon-latency)">
      <StatGrid
        items={[
          { label: t('techStack.more.scripts'), value: String(counts.scripts) },
          { label: t('techStack.more.stylesheets'), value: String(counts.stylesheets) },
          { label: t('techStack.more.images'), value: String(counts.images) },
        ]}
      />
      <StatGrid
        items={[
          { label: t('techStack.more.links'), value: String(counts.links) },
          { label: t('techStack.more.forms'), value: String(counts.forms) },
          { label: t('techStack.more.iframes'), value: String(counts.iframes) },
        ]}
      />
    </InfoCard>
  )
}

export function MoreInfoTab({ scan }: { scan: TechScan }) {
  return (
    <div className="columns-1 gap-x-3 @[440px]:columns-2">
      <OverviewSection scan={scan} />
      <ConnectionSection scan={scan} />
      <SecurityHeadersSection scan={scan} />
      <LinksSection scan={scan} />
      <ContentSection scan={scan} />
    </div>
  )
}
