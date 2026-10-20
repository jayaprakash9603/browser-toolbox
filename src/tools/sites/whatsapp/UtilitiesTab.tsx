import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function UtilitiesTab({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [check, setCheck] = useState('')

  const waLink = useMemo(() => {
    const n = phone.replace(/\D/g, '')
    if (!n) return ''
    const q = message ? `?text=${encodeURIComponent(message)}` : ''
    return `https://wa.me/${n}${q}`
  }, [phone, message])

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border bg-card p-3" data-search-id="clickToChat">
        <h3 className="mb-2 text-xs font-semibold">{t('sites.whatsapp.utilities.clickToChat')}</h3>
        <Input className="mb-2 text-xs" placeholder="Country code + number" value={phone} disabled={disabled} onChange={(e) => setPhone(e.target.value)} />
        <Input className="mb-2 text-xs" placeholder="Prefilled message" value={message} disabled={disabled} onChange={(e) => setMessage(e.target.value)} />
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer" className="break-all text-xs text-primary underline">
            {waLink}
          </a>
        )}
      </div>
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold">{t('sites.whatsapp.utilities.numberCheck')}</h3>
        <Input className="mb-2 text-xs" placeholder="Phone number" value={check} disabled={disabled} onChange={(e) => setCheck(e.target.value)} />
        <Button type="button" size="sm" disabled={disabled || !check} onClick={() => void sendMessage({ type: 'WA_EXPORT', kind: `check:${check}` })}>
          Check on WhatsApp
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('sites.whatsapp.utilities.unavailable')}: Google Contacts sync, public incoming API.</p>
    </div>
  )
}
