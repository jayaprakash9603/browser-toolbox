import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_CHAT_EXPORT_OPTIONS, type ChatExportFormat, type ChatExportOptions } from '@/core/sites/whatsapp'
import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

const FORMATS: { id: ChatExportFormat; labelKey: string }[] = [
  { id: 'html', labelKey: 'sites.whatsapp.export.formatHtml' },
  { id: 'json', labelKey: 'sites.whatsapp.export.formatJson' },
  { id: 'excel', labelKey: 'sites.whatsapp.export.formatExcel' },
  { id: 'csv', labelKey: 'sites.whatsapp.export.formatCsv' },
]

export function ChatExportPanel({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()
  const [opts, setOpts] = useState<ChatExportOptions>({ ...DEFAULT_CHAT_EXPORT_OPTIONS })
  const [busy, setBusy] = useState(false)

  const setBool = (key: keyof ChatExportOptions, value: boolean) =>
    setOpts((o) => ({ ...o, [key]: value }))

  const run = async () => {
    setBusy(true)
    try {
      const res = await sendMessage<{ ok?: boolean; file?: { filename: string; mime: string; content: string } | null }>({
        type: 'WA_EXPORT_CHAT',
        options: opts,
      })
      const file = res?.file
      if (!file?.content) return
      const blob = new Blob([file.content], { type: file.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-3" data-search-id="exportChat">
      <h3 className="mb-1 text-xs font-semibold">{t('sites.whatsapp.export.chatTitle')}</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">{t('sites.whatsapp.export.chatHint')}</p>

      <p className="mb-2 text-[11px] font-medium text-muted-foreground">{t('sites.whatsapp.export.format')}</p>
      <RadioGroup
        value={opts.format}
        onValueChange={(v) => setOpts((o) => ({ ...o, format: v as ChatExportFormat }))}
        className="mb-3 grid grid-cols-2 gap-2"
        disabled={disabled}
      >
        {FORMATS.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <RadioGroupItem value={f.id} id={`wa-fmt-${f.id}`} />
            <label htmlFor={`wa-fmt-${f.id}`} className="text-xs font-normal">{t(f.labelKey)}</label>
          </div>
        ))}
      </RadioGroup>

      <div className="mb-3 flex flex-col gap-2">
        {(
          [
            ['exportChatName', 'optChatName'],
            ['exportParticipantNames', 'optParticipants'],
            ['exportMedia', 'optMedia'],
            ['stableMedia', 'optStableMedia'],
            ['exportUtcTime', 'optUtc'],
            ['redactPhoneNumbers', 'optRedact'],
            ['onlyMyMessages', 'optOnlyMine'],
            ['excludeMyMessages', 'optExcludeMine'],
          ] as const
        ).map(([key, labelKey]) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              id={`wa-${key}`}
              checked={Boolean(opts[key])}
              disabled={disabled}
              onCheckedChange={(c) => setBool(key, c === true)}
            />
            <label htmlFor={`wa-${key}`} className="text-xs font-normal">{t(`sites.whatsapp.export.${labelKey}`)}</label>
          </div>
        ))}
      </div>

      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{t('sites.whatsapp.export.dateRange')}</p>
      <div className="mb-3 flex gap-2">
        <Input type="date" className="text-xs" disabled={disabled} value={opts.dateFrom} onChange={(e) => setOpts((o) => ({ ...o, dateFrom: e.target.value }))} />
        <Input type="date" className="text-xs" disabled={disabled} value={opts.dateTo} onChange={(e) => setOpts((o) => ({ ...o, dateTo: e.target.value }))} />
      </div>

      <Button type="button" size="sm" disabled={disabled || busy} onClick={() => void run()}>
        {t('sites.whatsapp.export.chatExportButton')}
      </Button>
    </div>
  )
}
