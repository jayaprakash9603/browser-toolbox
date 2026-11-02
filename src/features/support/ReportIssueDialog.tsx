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
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { useSettings } from '@/shared/hooks/useSettings'

import './report-issue.css'

const GENERAL_TOOL = '__general__'

export function ReportIssueDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { path } = useRouter()
  const settings = useSettings()
  const [title, setTitle] = useState('')
  const [toolId, setToolId] = useState(GENERAL_TOOL)
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [review, setReview] = useState(false)
  const [copiedReport, setCopiedReport] = useState('')
  const [copyError, setCopyError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) (review ? previewRef.current : titleRef.current)?.focus({ preventScroll: true })
  }, [open, review])
  const diagnostics = useMemo(
    () =>
      formatDiagnostics({
        version: chrome.runtime?.getManifest?.().version ?? 'unknown',
        userAgent: navigator.userAgent,
        route: path,
        theme: settings?.theme ?? 'system',
      }),
    [path, settings?.theme],
  )
  const tools = useMemo(
    () =>
      getPrimaryTools()
        .map((tool) => ({ id: tool.id, name: getToolName(tool, t) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [t],
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="report-dialog">
        <DialogHeader className="report-header">
          <span className="report-emblem" aria-hidden>
            <BugIcon className="size-5" />
          </span>
          <div className="min-w-0 pr-5">
            <DialogTitle className="text-base">
              {t('support.report.title', { defaultValue: 'Report an issue' })}
            </DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">
              {t('support.report.intro')}
            </DialogDescription>
          </div>
        </DialogHeader>
        <ol className="report-progress" aria-label={t('support.report.progress')}>
          {[t('support.report.details'), t('support.report.review')].map((label, index) => (
            <li key={label} aria-current={Number(review) === index ? 'step' : undefined}>
              <span aria-hidden>
                {index === 0 && review ? <CheckIcon className="size-3" /> : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        {!review ? (
          <form onSubmit={reviewReport} className="report-form">
            <div className="report-body">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label htmlFor="report-tool">
                  {t('support.report.tool', { defaultValue: 'Tool' })}
                </Label>
                <Select value={toolId} onValueChange={setToolId}>
                  <SelectTrigger id="report-tool" className="min-h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENERAL_TOOL}>
                      {t('support.report.general', { defaultValue: 'General / not tool-specific' })}
                    </SelectItem>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-description">
                  {t('support.report.description', { defaultValue: 'What went wrong?' })}{' '}
                  <span aria-hidden>*</span>
                </Label>
                <Textarea
                  id="report-description"
                  required
                  rows={3}
                  value={description}
                  placeholder={t('support.report.descriptionPlaceholder')}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <details className="report-disclosure">
                <summary>
                  {t('support.report.steps', { defaultValue: 'Steps to reproduce (optional)' })}
                </summary>
                <Label htmlFor="report-steps" className="sr-only">
                  {t('support.report.steps', { defaultValue: 'Steps to reproduce (optional)' })}
                </Label>
                <Textarea
                  id="report-steps"
                  rows={3}
                  value={steps}
                  placeholder={t('support.report.stepsPlaceholder')}
                  onChange={(event) => setSteps(event.target.value)}
                />
              </details>
              <div className="report-privacy">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="report-diagnostics"
                    checked={includeDiagnostics}
                    onCheckedChange={(value) => setIncludeDiagnostics(value === true)}
                  />
                  <Label htmlFor="report-diagnostics" className="min-h-11 flex flex-1 items-center">
                    {t('support.report.includeDiagnostics', {
                      defaultValue: 'Include basic diagnostics',
                    })}
                  </Label>
                  <ShieldCheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
                </div>
                <p>{t('support.report.privacyHint')}</p>
                {includeDiagnostics && (
                  <details className="report-disclosure mt-2">
                    <summary>{t('support.report.viewDiagnostics')}</summary>
                    <pre>{diagnostics}</pre>
                  </details>
                )}
              </div>
            </div>
            <footer className="report-footer">
              <p>{t('support.report.requiredHint')}</p>
              <Button type="submit" disabled={!ready} className="min-h-11 w-full">
                {t('support.report.reviewAction')}
                <ArrowRightIcon aria-hidden />
              </Button>
            </footer>
          </form>
        ) : (
          <div className="report-form">
            <div
              ref={previewRef}
              className="report-body"
              tabIndex={0}
              role="region"
              aria-label={t('support.report.preview')}
            >
              <h3 className="text-sm font-semibold">{t('support.report.preview')}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('support.report.sendHint')}
              </p>
              <pre className="report-preview">{reportText}</pre>
            </div>
            <footer className="report-footer">
              <Button
                variant="ghost"
                className="min-h-11 justify-start"
                onClick={() => setReview(false)}
              >
                <ArrowLeftIcon aria-hidden />
                {t('support.report.edit')}
              </Button>
              <Button asChild className="min-h-11 w-full">
                <a href={buildIssueUrl(report)} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon aria-hidden />
                  {t('support.report.openGithub', { defaultValue: 'Open GitHub issue' })}
                </a>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="min-h-11">
                  <a href={buildMailtoUrl(`One Panel — ${title.trim()}`, buildReportBody(report))}>
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
      </DialogContent>
    </Dialog>
  )
}
