import { isFeatureOn, type WhatsappPlusState } from '@/core/sites/whatsapp'

import { postToMain } from '../bridge'

type Wpp = {
  ev: { on: (e: string, fn: (...a: unknown[]) => void) => void; off: (e: string, fn: (...a: unknown[]) => void) => void }
  chat: { markIsRead?: (id: string) => Promise<unknown>; sendSeen?: (id: string) => Promise<unknown> }
  conn: { setOnline?: (on: boolean) => Promise<unknown> }
  privacy?: { setOnline?: (on: boolean) => Promise<unknown> }
}

let privacyStop: (() => void) | null = null
let revokeHandler: ((...a: unknown[]) => void) | null = null
let newMsgHandler: ((...a: unknown[]) => void) | null = null

function wpp(): Wpp | null {
  const w = window as Window & { WPP?: Wpp }
  return w.WPP ?? null
}

export function startPrivacy(state: WhatsappPlusState): void {
  stopPrivacy()
  const v = state.values
  const api = wpp()
  if (!api) return

  if (isFeatureOn(v, 'invisibleMode')) {
    void api.conn.setOnline?.(false)
    void api.privacy?.setOnline?.(false)
  }

  if (isFeatureOn(v, 'restoreDeletedMessages')) {
    newMsgHandler = (msg: unknown) => {
      postToMain('cacheMessage', msg)
    }
    revokeHandler = (data: unknown) => {
      postToMain('messageRevoked', data)
    }
    api.ev.on('chat.new_message', newMsgHandler)
    api.ev.on('chat.msg_revoke', revokeHandler)
  }

  privacyStop = () => {
    if (newMsgHandler) api.ev.off('chat.new_message', newMsgHandler)
    if (revokeHandler) api.ev.off('chat.msg_revoke', revokeHandler)
    newMsgHandler = null
    revokeHandler = null
    if (isFeatureOn(v, 'invisibleMode')) {
      void api.conn.setOnline?.(true)
      void api.privacy?.setOnline?.(true)
    }
  }
}

export function stopPrivacy(): void {
  privacyStop?.()
  privacyStop = null
}

/** Best-effort: block read receipts by no-oping mark read when enabled */
export function patchReadReceipts(enabled: boolean): void {
  const api = wpp()
  if (!api?.chat) return
  const chat = api.chat as { markIsRead?: (id: string) => Promise<unknown> }
  if (enabled && !(chat as { __tbxPatched?: boolean }).__tbxPatched) {
    const orig = chat.markIsRead?.bind(chat)
    if (orig) {
      chat.markIsRead = async () => undefined
      ;(chat as { __tbxPatched?: boolean }).__tbxPatched = true
      ;(chat as { __tbxOrigMark?: typeof orig }).__tbxOrigMark = orig
    }
  } else if (!enabled) {
    const orig = (chat as { __tbxOrigMark?: (id: string) => Promise<unknown> }).__tbxOrigMark
    if (orig) {
      chat.markIsRead = orig
      delete (chat as { __tbxPatched?: boolean }).__tbxPatched
    }
  }
}
