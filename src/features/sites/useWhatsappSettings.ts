import { useCallback, useEffect, useState } from 'react'

import {
  getWhatsappPlusState,
  updateWhatsappPlusState,
  type WhatsappFeatureValue,
  type WhatsappPlusData,
  type WhatsappPlusState,
} from '@/core/sites/whatsapp'

export function useWhatsappSettings() {
  const [state, setState] = useState<WhatsappPlusState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getWhatsappPlusState())
  }, [])

  useEffect(() => {
    void getWhatsappPlusState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.whatsappPlus) {
        setState(changes.whatsappPlus.newValue as WhatsappPlusState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(
    async (next: {
      enabled?: boolean
      values?: Partial<Record<string, WhatsappFeatureValue>>
      data?: Partial<WhatsappPlusData>
    }) => {
      setState(await updateWhatsappPlusState(next))
    },
    [],
  )

  return { state, patch, refresh }
}
