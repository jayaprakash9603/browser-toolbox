import { isFeatureOn, type WhatsappPlusState } from '@/core/sites/whatsapp'

import { postToMain } from '../bridge'

type Wpp = {
  ev: { on: (e: string, fn: (...a: unknown[]) => void) => void; off: (e: string, fn: (...a: unknown[]) => void) => void }
}

let privacyStop: (() => void) | null = null

export function startPrivacy(state: WhatsappPlusState): void {
  stopPrivacy()
  const api = (window as Window & { WPP?: Wpp }).WPP
  if (!api || !isFeatureOn(state.values, 'restoreDeletedMessages')) return

  const onNew = (msg: unknown) => postToMain('cacheMessage', msg)
  const onRevoke = (data: unknown) => postToMain('messageRevoked', data)
  api.ev.on('chat.new_message', onNew)
  api.ev.on('chat.msg_revoke', onRevoke)
  privacyStop = () => {
    api.ev.off('chat.new_message', onNew)
    api.ev.off('chat.msg_revoke', onRevoke)
  }
}

export function stopPrivacy(): void {
  privacyStop?.()
  privacyStop = null
}
