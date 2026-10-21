import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'

import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { useWebTool } from '../_shared'

export default function UtmBuilderTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.utm-builder')
  const [base, setBase] = useState('https://example.com/page')
  const [source, setSource] = useState('newsletter')
  const [medium, setMedium] = useState('email')
  const [campaign, setCampaign] = useState('spring_sale')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [qr, setQr] = useState<string | null>(null)

  const url = useMemo(() => {
    try {
      const u = new URL(base)
      if (source) u.searchParams.set('utm_source', source)
      if (medium) u.searchParams.set('utm_medium', medium)
      if (campaign) u.searchParams.set('utm_campaign', campaign)
      if (term) u.searchParams.set('utm_term', term)
      if (content) u.searchParams.set('utm_content', content)
      return u.toString()
    } catch {
      return ''
    }
  }, [base, source, medium, campaign, term, content])

  const makeQr = async () => {
    if (!url) return
    setQr(await QRCode.toDataURL(url, { margin: 1, width: 200 }))
  }

  return (
    <ToolPage tool={tool}>
      <div className="grid gap-2 text-xs">
        <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder={t('web.utm.base')} />
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="utm_source" />
        <Input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="utm_medium" />
        <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="utm_campaign" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="utm_term" />
        <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="utm_content" />
      </div>
      <Input readOnly className="mt-3 font-mono text-[11px]" value={url} />
      <div className="mt-2 flex gap-2">
        <CopyButton text={url} label={t('common.copy')} />
        <button type="button" className="text-xs text-primary underline" onClick={() => void makeQr()}>
          {t('web.utm.qr')}
        </button>
      </div>
      {qr && <img src={qr} alt="QR" className="mt-3 size-[200px] rounded border" />}
    </ToolPage>
  )
}
