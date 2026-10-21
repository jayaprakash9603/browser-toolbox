import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Slider } from '@/shared/components/ui/slider'
import { toolRegistry } from '@/core/registry'
import { sendToActiveTab } from '@/tools/web/tabMessaging'

function useTextTool(id: string) {
  const tool = toolRegistry.get(id)
  if (!tool) throw new Error(`Unknown tool: ${id}`)
  return tool
}

export default function ReadAloudTool() {
  const { t } = useTranslation()
  const tool = useTextTool('text.read-aloud')
  const [text, setText] = useState('')
  const [rate, setRate] = useState(1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceUri, setVoiceUri] = useState('')
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const load = () => setVoices(speechSynthesis.getVoices())
    load()
    speechSynthesis.onvoiceschanged = load
    return () => {
      speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const loadPage = async () => {
    const data = await sendToActiveTab<{ text: string }>({ type: 'GET_READABLE_TEXT' })
    setText(data?.text ?? '')
  }

  const speak = () => {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    const voice = voices.find((v) => v.voiceURI === voiceUri)
    if (voice) u.voice = voice
    utterRef.current = u
    speechSynthesis.speak(u)
  }

  const stop = () => speechSynthesis.cancel()

  return (
    <ToolPage tool={tool}>
      <Button size="sm" variant="outline" onClick={() => void loadPage()}>{t('text.readAloud.loadPage')}</Button>
      <textarea className="mt-2 min-h-[120px] w-full rounded-md border p-2 text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      <label className="mt-3 block text-xs">{t('text.readAloud.rate')}</label>
      <Slider className="mt-1" min={0.5} max={2} step={0.1} value={[rate]} onValueChange={([v]) => setRate(v)} />
      <select className="mt-3 w-full rounded-md border px-2 py-1 text-xs" value={voiceUri} onChange={(e) => setVoiceUri(e.target.value)}>
        <option value="">{t('text.readAloud.defaultVoice')}</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
        ))}
      </select>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={speak}>{t('text.readAloud.play')}</Button>
        <Button size="sm" variant="ghost" onClick={stop}>{t('text.readAloud.stop')}</Button>
      </div>
    </ToolPage>
  )
}
