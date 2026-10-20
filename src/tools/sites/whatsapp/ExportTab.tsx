import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import { contactsToCsv } from '@/core/sites/whatsapp'
import { Button } from '@/shared/components/ui/button'

const kinds = [
  { id: 'contacts_all', labelKey: 'sites.whatsapp.export.contacts' },
  { id: 'contacts_chatted', labelKey: 'sites.whatsapp.export.contacts' },
  { id: 'groups', labelKey: 'sites.whatsapp.export.groups' },
  { id: 'labels', labelKey: 'sites.whatsapp.export.labels' },
  { id: 'countries', labelKey: 'sites.whatsapp.export.countries' },
] as const

export function ExportTab({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()

  const runExport = async (kind: string) => {
    const res = await sendMessage<{ ok?: boolean; rows?: Record<string, string>[] }>({
      type: 'WA_EXPORT',
      kind,
    })
    if (!res?.rows?.length) return
    const csv = contactsToCsv(res.rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whatsapp-${kind}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-xs text-muted-foreground">Exports require an open, logged-in web.whatsapp.com tab.</p>
      <div className="flex flex-col gap-2">
        {kinds.map((k) => (
          <Button key={k.id} type="button" size="sm" variant="secondary" className="justify-start text-xs" disabled={disabled} onClick={() => void runExport(k.id)}>
            {t(k.labelKey)} ({k.id})
          </Button>
        ))}
      </div>
    </div>
  )
}
