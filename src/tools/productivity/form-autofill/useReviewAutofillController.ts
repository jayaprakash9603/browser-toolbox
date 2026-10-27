import type { AutofillController } from '@universal-form-autofill/sdk'
import type { createExtensionAutofillHost } from '@universal-form-autofill/sdk/extension'
import { useEffect, useState } from 'react'

type AutofillHost = ReturnType<typeof createExtensionAutofillHost>

/** Connects only after the store is in review mode so trusted-site matches never fill the page on scan. */
export function useReviewAutofillController(host: AutofillHost) {
  const [controller, setController] = useState<AutofillController | null>(null)

  useEffect(() => {
    const instance = host.createController()
    let cancelled = false

    void (async () => {
      const store = host.getStore()
      await store.ready()
      if (store.getSnapshot().settings.mode !== 'review') {
        await store.settings.update({ mode: 'review' })
      }
      if (cancelled) return
      await instance.connect()
      if (!cancelled) setController(instance)
    })().catch(() => {
      if (!cancelled) setController(null)
    })

    return () => {
      cancelled = true
      setController(null)
      instance.destroy()
    }
  }, [host])

  return controller
}
