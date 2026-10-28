import { useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BugIcon,
  DownloadIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  PinIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'

import { CopyButton } from '@/shared/components/CopyButton'
import { TextEditor } from '@/shared/components/TextEditor'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { ChoiceChips } from '@/shared/components/ChoiceChips'

import { useQaTool } from '../_shared'
import {
  FieldError,
  FieldLabel,
  Reveal,
  Section,
  Shake,
} from './fields'
import { ReadinessMeter } from './ReadinessMeter'
import { SeverityPicker } from './SeverityPicker'
import {
  BUG_TYPES,
  MAX_LABELS,
  PRIORITIES,
  REPRODUCIBILITY,
  REPORT_FORMATS,
  TITLE_MAX,
  addLabels,
  applyTemplate,
  createStep,
  formatReport,
  mailtoUrl,
  readiness,
  reportFile,
  reportTitle,
  validateDraft,
  type BugStep,
  type ReportFormat,
} from './report'
import { useActiveTab, useBugDraft, useReportPrefs } from './state'

type Tab = 'write' | 'preview'

function downloadText(text: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function BugReporterTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.bug-reporter')
  const titleId = useId()
  const severityLabelId = useId()
  const titleErrorId = useId()
  const actualId = useId()

  const { draft, context, update, pin } = useBugDraft()
  const active = useActiveTab()
  const [prefs, setPrefs] = useReportPrefs()
  const [tab, setTab] = useState<Tab>('write')
  const [preview, setPreview] = useState('')
  const [attempt, setAttempt] = useState(0)

  const page = context?.page ?? active.page
  const env = context?.page ? context.env : active.env
  const pinned = context != null
  const mismatch =
    pinned && active.page?.url && context.page?.url && active.page.url !== context.page.url

  const checks = useMemo(() => readiness(draft, false), [draft])
  const missing = useMemo(() => validateDraft(draft), [draft])
  const showErrors = attempt > 0

  const reportInput = useMemo(
    () => ({ draft, page, env, screenshotName: null }),
    [draft, page, env],
  )

  const generate = useCallback(() => {
    setAttempt((value) => value + 1)
    if (validateDraft(draft).length > 0) return
    const text = formatReport(reportInput, prefs.format, { skipEmpty: prefs.skipEmpty })
    setPreview(text)
    setTab('preview')
  }, [draft, prefs.format, prefs.skipEmpty, reportInput])

  const patchStep = (id: string, text: string) => {
    update({
      steps: draft.steps.map((step) => (step.id === id ? { ...step, text } : step)),
    })
  }

  const addStep = () => {
    if (draft.steps.length >= 12) return
    update({ steps: [...draft.steps, createStep()] })
  }

  const removeStep = (id: string) => {
    if (draft.steps.length <= 1) {
      update({ steps: [createStep()] })
      return
    }
    update({ steps: draft.steps.filter((step) => step.id !== id) })
  }

  const onTypeChange = (type: (typeof BUG_TYPES)[number]) => {
    update({ ...applyTemplate(draft, type) })
  }

  const previewText = useMemo(
    () => preview || formatReport(reportInput, prefs.format, { skipEmpty: prefs.skipEmpty }),
    [preview, reportInput, prefs.format, prefs.skipEmpty],
  )

  const downloadReport = () => {
    const { name, mime } = reportFile(reportTitle(draft), prefs.format)
    downloadText(previewText, name, mime)
  }

  const emailDraft = () => {
    window.open(mailtoUrl(reportTitle(draft), previewText), '_blank', 'noopener,noreferrer')
  }

  const headerActions = (
    <ReadinessMeter checks={checks} />
  )

  return (
    <ToolPage tool={tool} actions={headerActions}>
      <div className="@container flex flex-col gap-3">
        <Segmented
          value={tab}
          onValueChange={setTab}
          ariaLabel={t('bugReporter.tab.write')}
          className="w-full [&>button]:flex-1"
          options={[
            { value: 'write', label: t('bugReporter.tab.write') },
            { value: 'preview', label: t('bugReporter.tab.preview') },
          ]}
        />

        {tab === 'write' ? (
          <>
            <Reveal index={0}>
              <Section icon={GlobeIcon} title={t('bugReporter.page.title')} description={pinned ? t('bugReporter.page.pinned') : t('bugReporter.page.follow')}>
                {page ? (
                  <div className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-2.5">
                    {page.favIconUrl ? (
                      <img src={page.favIconUrl} alt="" className="mt-0.5 size-5 rounded-sm" />
                    ) : (
                      <GlobeIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{page.title || page.url}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{page.url}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7"
                        onClick={() => void active.refresh()}
                        disabled={active.loading}
                      >
                        <RefreshCwIcon className={active.loading ? 'motion-safe:animate-spin' : undefined} />
                        {t('bugReporter.page.refresh')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7"
                        onClick={() => (pinned ? pin(null) : pin({ page: active.page, env: active.env }))}
                      >
                        <PinIcon />
                        {pinned ? t('bugReporter.page.unpin') : t('bugReporter.page.pin')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('qa.noActiveTab')}</p>
                )}
                {mismatch && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-900 dark:text-amber-200">
                    <span className="min-w-0 flex-1">{t('bugReporter.page.mismatch')}</span>
                    <Button size="xs" variant="outline" className="h-6" onClick={() => pin({ page: active.page, env: active.env })}>
                      {t('bugReporter.page.useTab')}
                    </Button>
                  </div>
                )}
              </Section>
            </Reveal>

            <Reveal index={1}>
              <Section icon={BugIcon} title={t('bugReporter.summary.title')}>
                <div className="flex flex-col gap-3">
                  <Shake trigger={attempt} active={missing.includes('title')}>
                    <div className="flex flex-col gap-1">
                      <FieldLabel htmlFor={titleId} required hint={`${draft.title.length}/${TITLE_MAX}`}>
                        {t('bugReporter.title.label')}
                      </FieldLabel>
                      <Input
                        id={titleId}
                        value={draft.title}
                        maxLength={TITLE_MAX}
                        placeholder={t('bugReporter.title.placeholder')}
                        aria-invalid={showErrors && missing.includes('title')}
                        aria-describedby={showErrors && missing.includes('title') ? titleErrorId : undefined}
                        onChange={(event) => update({ title: event.target.value })}
                      />
                      <FieldError
                        id={titleErrorId}
                        message={showErrors && missing.includes('title') ? t('bugReporter.title.error') : null}
                      />
                    </div>
                  </Shake>

                  <div className="flex flex-col gap-1">
                    <p id={severityLabelId} className="text-xs font-medium text-foreground">
                      {t('bugReporter.severity.label')}
                    </p>
                    <SeverityPicker
                      value={draft.severity}
                      onChange={(severity) => update({ severity })}
                      labelId={severityLabelId}
                    />
                  </div>

                  <div className="grid gap-3 @[420px]:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>{t('bugReporter.priority.label')}</FieldLabel>
                      <ChoiceChips
                        value={draft.priority}
                        onValueChange={(priority) => update({ priority: priority as typeof draft.priority })}
                        ariaLabel={t('bugReporter.priority.label')}
                        columns={4}
                        options={PRIORITIES.map((value) => ({
                          value,
                          label: t(`bugReporter.priority.${value}`),
                        }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>{t('bugReporter.repro.label')}</FieldLabel>
                      <ChoiceChips
                        value={draft.reproducibility}
                        onValueChange={(value) =>
                          update({ reproducibility: value as typeof draft.reproducibility })
                        }
                        ariaLabel={t('bugReporter.repro.label')}
                        columns={2}
                        options={REPRODUCIBILITY.map((value) => ({
                          value,
                          label: t(`bugReporter.repro.${value}`),
                        }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <FieldLabel>{t('bugReporter.type.label')}</FieldLabel>
                    <ChoiceChips
                      value={draft.type}
                      onValueChange={(value) => onTypeChange(value as typeof draft.type)}
                      ariaLabel={t('bugReporter.type.label')}
                      columns={2}
                      options={BUG_TYPES.map((value) => ({
                        value,
                        label: t(`bugReporter.type.${value}`),
                      }))}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <FieldLabel hint={t('bugReporter.labels.hint', { count: draft.labels.length, max: MAX_LABELS })}>
                      {t('bugReporter.labels.label')}
                    </FieldLabel>
                    <Input
                      value={draft.labels.join(', ')}
                      placeholder={t('bugReporter.labels.placeholder')}
                      onChange={(event) => update({ labels: addLabels([], event.target.value) })}
                    />
                  </div>
                </div>
              </Section>
            </Reveal>

            <Reveal index={2}>
              <Section icon={FileTextIcon} title={t('bugReporter.details.title')}>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <FieldLabel>{t('bugReporter.expected.label')}</FieldLabel>
                    <TextEditor
                      value={draft.expected}
                      onChange={(expected) => update({ expected })}
                      minRows={2}
                      mono={false}
                      ariaLabel={t('bugReporter.expected.label')}
                    />
                  </label>

                  <Shake trigger={attempt} active={missing.includes('actual')}>
                    <label className="flex flex-col gap-1">
                      <FieldLabel htmlFor={actualId} required>
                        {t('bugReporter.actual.label')}
                      </FieldLabel>
                      <TextEditor
                        value={draft.actual}
                        onChange={(actual) => update({ actual })}
                        minRows={3}
                        mono={false}
                        ariaLabel={t('bugReporter.actual.label')}
                      />
                      <FieldError
                        id={actualId}
                        message={showErrors && missing.includes('actual') ? t('bugReporter.actual.error') : null}
                      />
                    </label>
                  </Shake>

                  <div className="flex flex-col gap-2">
                    <FieldLabel>{t('bugReporter.steps.label')}</FieldLabel>
                    <ol className="flex flex-col gap-2">
                      {draft.steps.map((step: BugStep, index) => (
                        <li key={step.id} className="flex items-start gap-1.5">
                          <span className="mt-2 w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground tabular-nums">
                            {index + 1}
                          </span>
                          <Input
                            value={step.text}
                            placeholder={t('bugReporter.steps.placeholder', { number: index + 1 })}
                            aria-label={t('bugReporter.steps.placeholder', { number: index + 1 })}
                            onChange={(event) => patchStep(step.id, event.target.value)}
                            className="min-w-0 flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('bugReporter.steps.remove')}
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ol>
                    <Button type="button" variant="outline" size="xs" className="w-fit" onClick={addStep}>
                      <PlusIcon />
                      {t('bugReporter.steps.add')}
                    </Button>
                  </div>

                  <label className="flex flex-col gap-1">
                    <FieldLabel>{t('bugReporter.notes.label')}</FieldLabel>
                    <TextEditor
                      value={draft.notes}
                      onChange={(notes) => update({ notes })}
                      minRows={2}
                      mono={false}
                      ariaLabel={t('bugReporter.notes.label')}
                    />
                  </label>
                </div>
              </Section>
            </Reveal>

            {showErrors && missing.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                <p className="font-medium">{t('bugReporter.validation.title')}</p>
                <ul className="mt-1 list-inside list-disc">
                  {missing.includes('title') && <li>{t('bugReporter.validation.titleField')}</li>}
                  {missing.includes('actual') && <li>{t('bugReporter.validation.actualField')}</li>}
                </ul>
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t bg-background/95 px-1 pt-3 pb-1 backdrop-blur-sm">
              <Button size="sm" className="shadow-md shadow-primary/15" onClick={generate}>
                <FileTextIcon />
                {t('bugReporter.generate')}
              </Button>
              <ChoiceChips
                value={prefs.format}
                onValueChange={(format) => setPrefs({ format: format as ReportFormat })}
                ariaLabel={t('bugReporter.format.label')}
                columns={4}
                options={REPORT_FORMATS.map((format) => ({
                  value: format,
                  label: t(`bugReporter.format.${format}`),
                }))}
              />
            </div>
          </>
        ) : (
          <Reveal index={0} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <CopyButton text={previewText} size="xs" label={t('bugReporter.copy')} />
              <Button size="xs" variant="outline" onClick={downloadReport}>
                <DownloadIcon />
                {t('bugReporter.download')}
              </Button>
              <Button size="xs" variant="ghost" onClick={emailDraft}>
                <MailIcon />
                {t('bugReporter.email')}
              </Button>
            </div>
            <TextEditor value={previewText} readOnly minRows={16} ariaLabel={t('qa.report')} />
          </Reveal>
        )}
      </div>
    </ToolPage>
  )
}
