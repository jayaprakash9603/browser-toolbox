import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QrCodeIcon, ScanLineIcon } from 'lucide-react'

import { buildContactPayload, buildEmailPayload, buildPhonePayload, buildWifiPayload, decodeQrFromImage, generateQrDataUrl, normalizeQrInput, type QrPreset } from '@/core/engines/qrcode'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { JsonErrorView } from '@/tools/developer/_shared'
import { downloadDataUrl } from '@/core/engines/capture'
import { fileToDataUrl, loadImageFromDataUrl } from '@/core/engines/image'
import { useGeneratorTool } from '../_shared'

const PRESETS: QrPreset[] = ['text', 'url', 'wifi', 'email', 'phone', 'contact']

export default function QrToolkitTool() {
  const { t } = useTranslation()
  const tool = useGeneratorTool('generators.qr-toolkit')
  const [mode, setMode] = useState<'generate' | 'decode'>('generate')
  const [preset, setPreset] = useState<QrPreset>('text')
  const [text, setText] = useState('')
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [encryption, setEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decoded, setDecoded] = useState<string | null>(null)

  const buildPayload = (): string => {
    switch (preset) {
      case 'wifi': return buildWifiPayload({ ssid, password, encryption })
      case 'email': return buildEmailPayload({ to: emailTo, subject: emailSubject })
      case 'phone': return buildPhonePayload(text)
      case 'contact': return buildContactPayload({ firstName, lastName, phone: text })
      case 'url': return normalizeQrInput(text)
      default: return text
    }
  }

  useEffect(() => {
    let live = true
    const payload = mode === 'generate' ? buildPayload() : ''
    if (!payload.trim() && preset !== 'wifi') {
      Promise.resolve().then(() => { if (live) setQr(null) })
      return () => { live = false }
    }
    void generateQrDataUrl(payload).then((result) => {
      if (!live) return
      if (result.ok) { setQr(result.value); setError(null) }
      else { setQr(null); setError(result.error) }
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, preset, text, ssid, password, encryption, emailTo, emailSubject, firstName, lastName])

  const decodeFile = async (file: File | null) => {
    if (!file) return
    setError(null)
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImageFromDataUrl(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) { setError('Canvas unavailable.'); return }
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = await decodeQrFromImage({ data: imageData.data, width: canvas.width, height: canvas.height })
    if (result.ok) setDecoded(result.value)
    else setError(result.error)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); setError(null); setDecoded(null) }}>
          <TabsList>
            <TabsTrigger value="generate"><QrCodeIcon className="size-3.5" /> {t('qr.generate')}</TabsTrigger>
            <TabsTrigger value="decode"><ScanLineIcon className="size-3.5" /> {t('qr.decode')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <TabsContent value="generate" className="mt-0 flex flex-col gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as QrPreset)}>
            <SelectTrigger aria-label={t('qr.type')}><SelectValue /></SelectTrigger>
            <SelectContent>{PRESETS.map((p) => <SelectItem key={p} value={p}>{t(`qr.preset.${p}`)}</SelectItem>)}</SelectContent>
          </Select>
          {(preset === 'text' || preset === 'url' || preset === 'phone') && (
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={preset === 'url' ? 'https://example.com' : preset === 'phone' ? '+15551234567' : t('qr.textPlaceholder')} aria-label={t('qr.content')} className="font-mono" />
          )}
          {preset === 'wifi' && (
            <>
              <Input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="SSID" aria-label="SSID" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('qr.password')} aria-label={t('qr.password')} />
              <Select value={encryption} onValueChange={(v) => setEncryption(v as typeof encryption)}>
                <SelectTrigger aria-label={t('qr.encryption')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WPA">WPA/WPA2</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="nopass">{t('qr.open')}</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {preset === 'email' && (
            <>
              <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com" aria-label={t('qr.emailTo')} />
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder={t('qr.subject')} aria-label={t('qr.subject')} />
            </>
          )}
          {preset === 'contact' && (
            <>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('qr.firstName')} aria-label={t('qr.firstName')} />
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('qr.lastName')} aria-label={t('qr.lastName')} />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('qr.phone')} aria-label={t('qr.phone')} />
            </>
          )}
          {error && <JsonErrorView message={error} />}
          {qr && (
            <div className="flex flex-col items-center gap-2 rounded-md border p-3">
              <img src={qr} alt={t('qr.preview')} className="size-48 rounded" />
              <Button size="sm" onClick={() => downloadDataUrl(qr, `qr-${Date.now()}.png`)}>{t('capture.download')}</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="decode" className="mt-0 flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-xs text-muted-foreground hover:bg-accent/40">
            <ScanLineIcon className="size-4" />
            {t('qr.uploadImage')}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => void decodeFile(e.target.files?.[0] ?? null)} aria-label={t('qr.uploadImage')} />
          </label>
          {error && <JsonErrorView message={error} />}
          {decoded && (
            <div className="rounded-md border bg-muted/40 p-2">
              <p className="text-[10px] text-muted-foreground">{t('qr.decoded')}</p>
              <code className="break-all font-mono text-[11px]">{decoded}</code>
            </div>
          )}
        </TabsContent>
      </div>
    </ToolPage>
  )
}
