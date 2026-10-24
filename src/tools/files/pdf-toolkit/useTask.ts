import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PdfPasswordError } from '@/core/engines/pdf/pdfjs'

/** Busy flag and error message around one async action at a time. */
export function useTask() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (task: () => Promise<void>) => {
      setBusy(true)
      setError(null)
      try {
        await task()
      } catch (cause) {
        if (cause instanceof PdfPasswordError) setError(t('pdf.password.incorrect'))
        else setError(cause instanceof Error && cause.message ? cause.message : t('pdf.failed'))
      } finally {
        setBusy(false)
      }
    },
    [t],
  )
  return { busy, error, setError, run }
}
