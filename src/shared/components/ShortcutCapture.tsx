import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { acceleratorFromKeyboardEvent, formatAcceleratorDisplay } from '@/core/commands'
import { Button } from '@/shared/components/ui/button'

interface ShortcutCaptureProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function ShortcutCapture({ value, onChange, disabled }: ShortcutCaptureProps) {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const stopRecording = useCallback(() => setRecording(false), [])

  useEffect(() => {
    if (!recording) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        stopRecording()
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        onChange(null)
        stopRecording()
        return
      }
      const accel = acceleratorFromKeyboardEvent(event)
      if (!accel) return
      onChange(accel)
      stopRecording()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recording, onChange, stopRecording])

  const label =
    value == null
      ? t('shortcuts.disabled')
      : formatAcceleratorDisplay(value)

  return (
    <div className="flex items-center gap-2">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="min-w-[7rem] font-mono text-xs"
        onClick={() => setRecording((r) => !r)}
      >
        {recording ? t('shortcuts.pressKeys') : label}
      </Button>
      {value != null && !recording && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          {t('shortcuts.clear')}
        </Button>
      )}
    </div>
  )
}
