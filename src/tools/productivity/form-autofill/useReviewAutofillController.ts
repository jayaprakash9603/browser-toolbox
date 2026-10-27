import type { AutofillController } from '@universal-form-autofill/sdk'
import type { createExtensionAutofillHost } from '@universal-form-autofill/sdk/extension'
import { useEffect, useState } from 'react'

type AutofillHost = ReturnType<typeof createExtensionAutofillHost>

/**
 * Connects only when `enabled` is true (user chose to scan the page). Review mode is enforced so
 * trusted-site matches never fill the page on scan or connect.
 */
export function useReviewAutofillController(host: AutofillHost, enabled: boolean) {
  const [controller, setController] = useState<AutofillController | null>(null)

  useEffect(() => {
    if (!enabled) {
      setController(null)
      return
    }

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
  }, [host, enabled])

  return controller
}
