import { useEffect, useEffectEvent } from 'react'

import { subscribePayload } from '@/core/payloads'

export function usePayloadText(toolId: string, apply: (text: string) => void) {
  const onText = useEffectEvent(apply)
  useEffect(
    () =>
      subscribePayload(toolId, (payload) => {
        if (payload.text) onText(payload.text)
      }),
    [toolId],
  )
}
