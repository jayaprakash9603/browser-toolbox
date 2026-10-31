import { useMemo, useState } from 'react'
import { CopyIcon, ExternalLinkIcon, MailIcon } from 'lucide-react'
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

const GENERAL_TOOL = '__general__'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function useDiagnostics(): string {
  const { path } = useRouter()
  const settings = useSettings()
  return useMemo(
    () =>
      formatDiagnostics({
        version: chrome.runtime?.getManifest?.().version ?? 'unknown',
        userAgent: navigator.userAgent,
        route: path,
        theme: settings?.theme ?? 'system',
      }),
    [path, settings?.theme],
  )
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { t } = useTranslation()
  const diagnostics = useDiagnostics()
  const [title, setTitle] = useState('')
  const [toolId, setToolId] = useState(GENERAL_TOOL)
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [copied, setCopied] = useState(false)

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
  const ready = title.trim().length > 0 && description.trim().length > 0

  const copyReport = async () => {
    await navigator.clipboard.writeText(`${title.trim()}\n\n${buildReportBody(report)}`)
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(26rem,calc(100vw-1rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('support.report.title', { defaultValue: 'Report an issue' })}</DialogTitle>
          <DialogDescription>
            {t('support.report.hint', {
              defaultValue:
                'Nothing is sent from the extension. You review the report, then choose where to send it.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-title">{t('support.report.issueTitle', { defaultValue: 'Title' })}</Label>
          <Input id="report-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-tool">{t('support.report.tool', { defaultValue: 'Tool' })}</Label>
          <Select value={toolId} onValueChange={setToolId}>
            <SelectTrigger id="report-tool">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-description">
            {t('support.report.description', { defaultValue: 'What went wrong?' })}
          </Label>
          <Textarea
            id="report-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-steps">
            {t('support.report.steps', { defaultValue: 'Steps to reproduce (optional)' })}
          </Label>
          <Textarea id="report-steps" rows={2} value={steps} onChange={(event) => setSteps(event.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-2.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="report-diagnostics"
              checked={includeDiagnostics}
              onCheckedChange={(value) => setIncludeDiagnostics(value === true)}
            />
            <Label htmlFor="report-diagnostics">
              {t('support.report.includeDiagnostics', { defaultValue: 'Include basic diagnostics' })}
            </Label>
          </div>
          {includeDiagnostics && (
            <pre className="text-[11px] leading-4 break-words whitespace-pre-wrap text-muted-foreground">
              {diagnostics}
            </pre>
          )}
          <p className="text-[11px] leading-4 text-muted-foreground">
            {t('support.report.noPageData', {
              defaultValue:
                'Page content, cookies, tokens and passwords are never attached. Do not paste secrets into the description.',
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild disabled={!ready} className={ready ? '' : 'pointer-events-none opacity-50'}>
            <a href={ready ? buildIssueUrl(report) : undefined} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon aria-hidden />
              {t('support.report.openGithub', { defaultValue: 'Open GitHub issue' })}
            </a>
          </Button>
          <Button asChild variant="outline" disabled={!ready} className={ready ? '' : 'pointer-events-none opacity-50'}>
            <a href={ready ? buildMailtoUrl(`One Panel — ${title.trim()}`, buildReportBody(report)) : undefined}>
              <MailIcon aria-hidden />
              {t('support.report.email', { defaultValue: 'Email report' })}
            </a>
          </Button>
          <Button type="button" variant="ghost" disabled={!ready} onClick={() => void copyReport()}>
            <CopyIcon aria-hidden />
            {copied
              ? t('support.report.copied', { defaultValue: 'Copied' })
              : t('support.report.copy', { defaultValue: 'Copy report' })}
          </Button>
        </div>
        <p className="sr-only" role="status">
          {copied ? t('support.report.copied', { defaultValue: 'Copied' }) : ''}
        </p>
      </DialogContent>
    </Dialog>
  )
}
