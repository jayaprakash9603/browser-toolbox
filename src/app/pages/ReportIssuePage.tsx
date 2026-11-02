import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BugIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  MailIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { getPrimaryTools } from '@/core/registry/userCategories'
import {
  buildIssueUrl,
  buildMailtoUrl,
  buildReportBody,
  formatDiagnostics,
  type IssueReport,
} from '@/core/support/config'
import { getToolName } from '@/i18n/toolLabels'
import { BackButton } from '@/shared/components/BackButton'
import { Autocomplete } from '@/shared/components/Autocomplete'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useSettings } from '@/shared/hooks/useSettings'

import './report-issue-page.css'

const GENERAL_TOOL = '__general__'

function getIssueOrigin(search: string): { route: string; returnTo: string } {
  const requested = new URLSearchParams(search).get('from')
  if (!requested || !requested.startsWith('/') || requested.startsWith('//')) {
    return { route: '/report-issue', returnTo: '/' }
  }
  const path = requested.split('?')[0]
  if (path === '/report-issue') return { route: '/report-issue', returnTo: '/' }
  return { route: requested, returnTo: requested }
}

export default function ReportIssuePage() {
  const { t } = useTranslation()
  const { path, search } = useRouter()
  const settings = useSettings()
  const origin = getIssueOrigin(search)
  const [title, setTitle] = useState('')
  const [toolId, setToolId] = useState(() => {
    const sourcePath = origin.route.split('?')[0]
    return getPrimaryTools().find((tool) => tool.route === sourcePath)?.id ?? GENERAL_TOOL
  })
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [review, setReview] = useState(false)
  const [copiedReport, setCopiedReport] = useState('')
  const [copyError, setCopyError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ;(review ? previewRef.current : titleRef.current)?.focus({ preventScroll: true })
  }, [review])

  const tools = useMemo(
    () =>
      getPrimaryTools()
        .map((tool) => ({ id: tool.id, name: getToolName(tool, t) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [t],
  )
  const diagnostics = useMemo(
    () =>
      formatDiagnostics({
        version: chrome.runtime?.getManifest?.().version ?? 'unknown',
        userAgent: navigator.userAgent,
        route: origin.route === '/report-issue' ? path : origin.route,
        theme: settings?.theme ?? 'system',
      }),
    [origin.route, path, settings?.theme],
  )

  const report: IssueReport = {
    title,
    toolName: tools.find((tool) => tool.id === toolId)?.name ?? 'General',
    description,
    steps,
    diagnostics: includeDiagnostics ? diagnostics : '',
  }
  const reportText = `${title.trim()}\n\n${buildReportBody(report)}`
  const ready = title.trim().length > 0 && description.trim().length > 0
  const copied = copiedReport === reportText

  const copyReport = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(reportText)
      setCopiedReport(reportText)
    } catch (error) {
      console.error('Unable to copy issue report', error)
      setCopyError(t('support.report.copyError'))
    }
  }

  const reviewReport = (event: FormEvent) => {
    event.preventDefault()
    if (ready) setReview(true)
  }

  return (
    <div className="report-page">
      <div className="report-page-shell">
        <header className="report-page-header">
          <BackButton to={origin.returnTo} className="report-back" />
          <span className="report-emblem" aria-hidden>
            <BugIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="report-kicker">{t('support.title')}</p>
            <h1>{t('support.report.title', { defaultValue: 'Report an issue' })}</h1>
            <p className="report-page-intro">{t('support.report.intro')}</p>
          </div>
        </header>

        <ol className="report-progress" aria-label={t('support.report.progress')}>
          {[t('support.report.details'), t('support.report.review')].map((label, index) => (
            <li key={label} aria-current={Number(review) === index ? 'step' : undefined}>
              <span aria-hidden>
                {index === 0 && review ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="report-page-grid">
          <div className="report-primary">
            {!review ? (
              <form onSubmit={reviewReport} className="report-form">
                <section className="report-panel">
                  <div className="report-panel-heading">
                    <span className="report-panel-number">01</span>
                    <div>
                      <h2>{t('support.report.formHeading')}</h2>
                      <p>{t('support.report.formHint')}</p>
                    </div>
                  </div>

                  <div className="report-fields">
                    <div className="report-field">
                      <Label htmlFor="report-title">
                        {t('support.report.issueTitle', { defaultValue: 'Title' })}{' '}
                        <span aria-hidden>*</span>
                      </Label>
                      <Input
                        id="report-title"
                        ref={titleRef}
                        required
                        value={title}
                        placeholder={t('support.report.titlePlaceholder')}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </div>

                    <div className="report-field">
                      <Label htmlFor="report-tool">
                        {t('support.report.tool', { defaultValue: 'Tool' })}
                      </Label>
                      <Autocomplete
                        id="report-tool"
                        value={toolId}
                        onValueChange={setToolId}
                        placeholder={t('support.report.toolPlaceholder', {
                          defaultValue: 'Search tools…',
                        })}
                        noResultsLabel={t('support.report.noToolMatches', {
                          defaultValue: 'No matching tools',
                        })}
                        options={[
                          {
                            value: GENERAL_TOOL,
                            label: t('support.report.general', {
                              defaultValue: 'General / not tool-specific',
                            }),
                          },
                          ...tools.map((tool) => ({ value: tool.id, label: tool.name })),
                        ]}
                      />
                    </div>

                    <div className="report-field report-field-wide">
                      <Label htmlFor="report-description">
                        {t('support.report.description', { defaultValue: 'What went wrong?' })}{' '}
                        <span aria-hidden>*</span>
                      </Label>
                      <Textarea
                        id="report-description"
                        required
                        rows={5}
                        value={description}
                        placeholder={t('support.report.descriptionPlaceholder')}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                      <p className="report-field-hint">{t('support.report.descriptionHint')}</p>
                    </div>

                    <details className="report-disclosure report-field-wide">
                      <summary>
                        <span>
                          {t('support.report.steps', {
                            defaultValue: 'Steps to reproduce (optional)',
                          })}
                        </span>
                        <span className="report-optional">{t('common.optional')}</span>
                      </summary>
                      <Label htmlFor="report-steps" className="sr-only">
                        {t('support.report.steps', {
                          defaultValue: 'Steps to reproduce (optional)',
                        })}
                      </Label>
                      <Textarea
                        id="report-steps"
                        rows={4}
                        value={steps}
                        placeholder={t('support.report.stepsPlaceholder')}
                        onChange={(event) => setSteps(event.target.value)}
                      />
                    </details>
                  </div>
                </section>

                <section className="report-panel report-privacy">
                  <div className="report-privacy-icon" aria-hidden>
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="report-privacy-heading">
                      <div>
                        <h2>{t('support.report.privacyTitle')}</h2>
                        <p>{t('support.report.privacyHint')}</p>
                      </div>
                      <Checkbox
                        id="report-diagnostics"
                        checked={includeDiagnostics}
                        onCheckedChange={(value) => setIncludeDiagnostics(value === true)}
                      />
                    </div>
                    <Label htmlFor="report-diagnostics" className="report-diagnostics-label">
                      {t('support.report.includeDiagnostics', {
                        defaultValue: 'Include basic diagnostics',
                      })}
                    </Label>
                    {includeDiagnostics && (
                      <details className="report-disclosure report-diagnostics-details">
                        <summary>{t('support.report.viewDiagnostics')}</summary>
                        <pre>{diagnostics}</pre>
                      </details>
                    )}
                  </div>
                </section>

                <footer className="report-footer">
                  <p>{t('support.report.requiredHint')}</p>
                  <Button type="submit" disabled={!ready} className="min-h-11 w-full sm:w-auto">
                    {t('support.report.reviewAction')}
                    <ArrowRightIcon aria-hidden />
                  </Button>
                </footer>
              </form>
            ) : (
              <div className="report-form">
                <section
                  ref={previewRef}
                  className="report-panel report-review-panel"
                  tabIndex={-1}
                  role="region"
                  aria-label={t('support.report.preview')}
                >
                  <div className="report-panel-heading">
                    <span className="report-panel-number report-panel-number-complete">
                      <CheckIcon className="size-4" aria-hidden />
                    </span>
                    <div>
                      <h2>{t('support.report.reviewHeading')}</h2>
                      <p>{t('support.report.sendHint')}</p>
                    </div>
                  </div>
                  <div className="report-review-meta">
                    <span>{t('support.report.tool', { defaultValue: 'Tool' })}</span>
                    <strong>{report.toolName}</strong>
                  </div>
                  <h3 className="report-review-title">{title}</h3>
                  <pre className="report-preview">{reportText}</pre>
                </section>

                <footer className="report-footer report-share-footer">
                  <p>{t('support.report.noAutoSend')}</p>
                  <div className="report-share-actions">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setReview(false)}
                    >
                      <ArrowLeftIcon aria-hidden />
                      {t('support.report.edit')}
                    </Button>
                    <Button asChild className="min-h-11">
                      <a href={buildIssueUrl(report)} target="_blank" rel="noopener noreferrer">
                        <ExternalLinkIcon aria-hidden />
                        {t('support.report.openGithub', { defaultValue: 'Open GitHub issue' })}
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="min-h-11">
                      <a
                        href={buildMailtoUrl(
                          `One Panel — ${title.trim()}`,
                          buildReportBody(report),
                        )}
                      >
                        <MailIcon aria-hidden />
                        {t('support.report.email', { defaultValue: 'Email report' })}
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => void copyReport()}
                    >
                      {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                      {copied
                        ? t('support.report.copied', { defaultValue: 'Copied' })
                        : t('support.report.copy', { defaultValue: 'Copy report' })}
                    </Button>
                  </div>
                  {copyError && (
                    <p role="alert" className="text-destructive">
                      {copyError}
                    </p>
                  )}
                  <p role="status" className="sr-only">
                    {copied ? t('support.report.copied', { defaultValue: 'Copied' }) : ''}
                  </p>
                </footer>
              </div>
            )}
          </div>

          <aside className="report-aside" aria-label={t('support.report.helpTitle')}>
            <section className="report-aside-card report-aside-featured">
              <span className="report-aside-icon" aria-hidden>
                <ShieldCheckIcon className="size-5" />
              </span>
              <h2>{t('support.report.privacyTitle')}</h2>
              <p>{t('support.report.asidePrivacy')}</p>
              <ul>
                <li>{t('support.report.privacyItemOne')}</li>
                <li>{t('support.report.privacyItemTwo')}</li>
                <li>{t('support.report.privacyItemThree')}</li>
              </ul>
            </section>

            <section className="report-aside-card">
              <h2>{t('support.report.howItWorks')}</h2>
              <ol className="report-aside-steps">
                <li>
                  <span>1</span>
                  <p>{t('support.report.howStepOne')}</p>
                </li>
                <li>
                  <span>2</span>
                  <p>{t('support.report.howStepTwo')}</p>
                </li>
                <li>
                  <span>3</span>
                  <p>{t('support.report.howStepThree')}</p>
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
