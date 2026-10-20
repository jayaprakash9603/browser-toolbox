import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/whatsapp/constants'

import { startPrivacy, stopPrivacy, patchReadReceipts } from './features/privacy'

type Guarded = Window & {
  __toolboxWaMain?: boolean
  WPP?: {
    isReady: Promise<void>
    chat: Record<string, unknown>
    contact?: Record<string, unknown>
  }
}

function getWpp(): Guarded['WPP'] {
  return (window as Guarded).WPP
}

async function whenReady(): Promise<void> {
  const wpp = getWpp()
  if (!wpp) return
  await wpp.isReady
}

async function handleCmd(cmd: string, payload: unknown): Promise<void> {
  await whenReady()
  const wpp = getWpp()
  if (!wpp) return

  if (cmd === 'syncState') {
    if (!payload || typeof payload !== 'object') {
      stopPrivacy()
      patchReadReceipts(false)
      return
    }
    const p = payload as { values: Record<string, unknown>; data: unknown }
    const state = { enabled: true, values: p.values, data: p.data } as import('@/core/sites/whatsapp').WhatsappPlusState
    startPrivacy(state)
    patchReadReceipts(p.values.disableReadReceipts === true)
    return
  }

  if (cmd === 'toggleRead' && wpp.chat) {
    const active = (wpp.chat.getActiveChat as (() => { id?: { _serialized?: string } }) | undefined)?.()
    const id = active?.id?._serialized
    if (id && wpp.chat.markIsUnread) await (wpp.chat.markIsUnread as (c: string) => Promise<unknown>)(id)
    else if (id && wpp.chat.markIsRead) await (wpp.chat.markIsRead as (c: string) => Promise<unknown>)(id)
  }

  if (cmd === 'pinChat' && wpp.chat?.pin) {
    const active = (wpp.chat.getActiveChat as () => { id?: { _serialized?: string } })?.()
    const id = active?.id?._serialized
    if (id) await (wpp.chat.pin as (c: string) => Promise<unknown>)(id)
  }

  if (cmd === 'startChat' && payload && typeof payload === 'object') {
    const num = String((payload as { number: string }).number).replace(/\D/g, '')
    if (num && wpp.chat?.openChatBottom) await (wpp.chat.openChatBottom as (id: string) => Promise<unknown>)(`${num}@c.us`)
  }

  if (cmd === 'likeMessage' && wpp.chat?.sendTextMessage) {
    const active = (wpp.chat.getActiveChat as () => { id?: { _serialized?: string } })?.()
    const id = active?.id?._serialized
    if (id) await (wpp.chat.sendTextMessage as (to: string, t: string) => Promise<unknown>)(id, '👍')
  }

  if (cmd === 'translateMessage' && payload && typeof payload === 'object') {
    const text = String((payload as { text: string }).text)
    const Translator = (window as Window & { Translator?: { create: (o: object) => Promise<{ translate: (t: string) => Promise<{ targetText: string }> }> } }).Translator
    if (Translator && text) {
      try {
        const tr = await Translator.create({ sourceLanguage: 'auto', targetLanguage: 'en' })
        const out = await tr.translate(text)
        alert(out.targetText)
      } catch {
        alert('Translation not available in this browser.')
      }
    } else {
      alert('Translation not available in this browser.')
    }
  }

  if (cmd === 'export' && payload && typeof payload === 'object') {
    const kind = String((payload as { kind: string }).kind)
    const rows: Record<string, string>[] = []
    try {
      if (kind.startsWith('check:')) {
        const num = kind.slice(6).replace(/\D/g, '')
        const exists = wpp.contact?.queryExists
          ? await (wpp.contact.queryExists as (id: string) => Promise<{ wid?: unknown }>)(`${num}@c.us`)
          : null
        rows.push({ number: num, exists: exists?.wid ? 'yes' : 'no' })
      } else if (wpp.contact?.list) {
        const list = await (wpp.contact.list as () => Promise<{ id?: { user?: string }; name?: string }[]>)()
        for (const c of list ?? []) {
          rows.push({ id: c.id?.user ?? '', name: c.name ?? '' })
        }
      }
    } catch {
      /* WPP not ready */
    }
    window.postMessage({ [PAGE_EVT_KEY]: 'exportResult', payload: rows }, location.origin || '*')
    return
  }

  if (cmd === 'sendText' && payload && typeof payload === 'object' && wpp.chat?.sendTextMessage) {
    const { chatId, text } = payload as { chatId: string; text: string }
    await (wpp.chat.sendTextMessage as (to: string, t: string) => Promise<unknown>)(chatId, text)
  }

  if (cmd === 'cacheMessage' || cmd === 'messageRevoked') {
    void chrome.runtime.sendMessage({ type: cmd === 'cacheMessage' ? 'WA_CACHE_MESSAGE' : 'WA_MESSAGE_REVOKED', payload })
  }

  if (cmd === 'presence') {
    void chrome.runtime.sendMessage({ type: 'WA_PRESENCE', payload })
  }

  window.postMessage({ [PAGE_EVT_KEY]: 'ack', payload: cmd }, location.origin || '*')
}

const guarded = window as Guarded
if (!guarded.__toolboxWaMain && window === window.top) {
  guarded.__toolboxWaMain = true
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data as Record<string, unknown> | null
    if (!data || data[PAGE_CMD_KEY] === undefined) return
    const cmd = String(data[PAGE_CMD_KEY])
    void handleCmd(cmd, data.payload)
  })

  void whenReady().then(() => {
    void chrome.runtime.sendMessage({ type: 'WA_RUNTIME_STATUS', status: 'ready' })
  }).catch(() => {
    void chrome.runtime.sendMessage({ type: 'WA_RUNTIME_STATUS', status: 'not_logged_in' })
  })
}
