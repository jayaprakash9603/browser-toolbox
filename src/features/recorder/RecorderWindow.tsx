import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MicIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

function reportMic(granted: boolean): void {
  void chrome.runtime.sendMessage({ type: 'RECORDER_MIC_RESULT', granted }).catch(() => undefined)
}

async function askMicrophone(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch {
    return false
  }
}

/** Runs inside an invisible frame on the current page; Chrome shows its standard prompt. */
function EmbeddedMicPermission() {
  useEffect(() => {
    void askMicrophone().then(reportMic)
  }, [])
  return null
}

/** Fallback window for pages where a frame cannot be injected (chrome:// pages, the Web Store). */
function MicPermission() {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'granted' | 'denied'>('idle')

  const request = async () => {
    const granted = await askMicrophone()
    reportMic(granted)
    setState(granted ? 'granted' : 'denied')
    if (granted) window.setTimeout(() => window.close(), 1200)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <MicIcon className="size-10 text-primary" />
      <h1 className="text-lg font-semibold">{t('recorder.window.micTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t('recorder.window.micHint')}</p>
      {state === 'granted' ? (
        <p className="text-sm font-medium text-emerald-600">{t('recorder.window.micGranted')}</p>
      ) : (
        <Button onClick={() => void request()}>{t('recorder.window.micAllow')}</Button>
      )}
      {state === 'denied' && <p className="text-sm text-destructive">{t('recorder.window.micDenied')}</p>}
    </div>
  )
}

export function RecorderWindow() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('embed') === '1') return <EmbeddedMicPermission />
  return <MicPermission />
}
