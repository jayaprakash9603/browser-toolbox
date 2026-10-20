import {
  buildChatExportFile,
  type ChatExportOptions,
  normalizeMessages,
} from '@/core/sites/whatsapp/chatExport'
import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/whatsapp/constants'
import { countryForNumber } from '@/core/sites/whatsapp/countries'

import { startPrivacy, stopPrivacy } from './features/privacy'

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

type Wid = { user?: string; server?: string; _serialized?: string }
type ChatLike = {
  id?: Wid
  name?: string
  formattedTitle?: string
  unreadCount?: number
  archive?: boolean
  pin?: number
  isGroup?: boolean
  muteExpiration?: number
  contact?: { isMyContact?: boolean; pushname?: string; name?: string }
  groupMetadata?: { participants?: { length?: number; getModelsArray?: () => unknown[] } }
}
type ContactLike = { id?: Wid; name?: string; pushname?: string; isMyContact?: boolean; isBusiness?: boolean }

function call<T>(fn: unknown, ...args: unknown[]): Promise<T | undefined> {
  if (typeof fn !== 'function') return Promise.resolve(undefined)
  return Promise.resolve((fn as (...a: unknown[]) => T | Promise<T>)(...args)).catch(() => undefined)
}

function participantCount(chat: ChatLike): number {
  const p = chat.groupMetadata?.participants
  if (!p) return 0
  return p.getModelsArray?.().length ?? p.length ?? 0
}

function isUserChat(c: ChatLike): boolean {
  return c.id?.server === 'c.us' || c.id?.server === 'lid'
}

async function runQuery(wpp: NonNullable<Guarded['WPP']>, kind: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = []
  try {
    if (kind.startsWith('check:')) {
      const num = kind.slice(6).replace(/\D/g, '')
      const exists = await call<{ wid?: unknown }>(wpp.contact?.queryExists, `${num}@c.us`)
      rows.push({ number: num, exists: exists?.wid ? 'yes' : 'no' })
      return rows
    }

    const chats = (await call<ChatLike[]>(wpp.chat.list)) ?? []
    const contacts = (await call<ContactLike[]>(wpp.contact?.list)) ?? []

    if (kind === 'contacts_all' || kind === 'contacts') {
      for (const c of contacts) {
        if (!c.isMyContact || c.id?.server !== 'c.us') continue
        rows.push({ number: c.id?.user ?? '', name: c.name ?? '', pushname: c.pushname ?? '' })
      }
    } else if (kind === 'contacts_chatted' || kind === 'contacts_unsaved') {
      const unsavedOnly = kind === 'contacts_unsaved'
      for (const c of chats) {
        if (!isUserChat(c)) continue
        const saved = c.contact?.isMyContact === true
        if (unsavedOnly && saved) continue
        rows.push({
          number: c.id?.user ?? '',
          name: c.contact?.name ?? c.formattedTitle ?? '',
          pushname: c.contact?.pushname ?? '',
          saved: saved ? 'yes' : 'no',
        })
      }
    } else if (kind === 'groups') {
      for (const c of chats) {
        if (c.id?.server !== 'g.us') continue
        rows.push({ id: c.id?._serialized ?? '', name: c.formattedTitle ?? c.name ?? '', participants: String(participantCount(c)) })
      }
    } else if (kind === 'labels') {
      const labelsApi = (window as Guarded & { WPP?: { labels?: Record<string, unknown> } }).WPP?.labels
      const labels = (await call<{ id?: string; name?: string; hexColor?: string; count?: number }[]>(labelsApi?.getAllLabels)) ?? []
      for (const l of labels) {
        rows.push({ id: String(l.id ?? ''), name: l.name ?? '', color: l.hexColor ?? '', chats: String(l.count ?? '') })
      }
    } else if (kind === 'countries') {
      const counts = new Map<string, { code: string; country: string; n: number }>()
      for (const c of contacts) {
        if (!c.isMyContact || c.id?.server !== 'c.us' || !c.id.user) continue
        const { code, country } = countryForNumber(c.id.user)
        const cur = counts.get(country) ?? { code, country, n: 0 }
        cur.n++
        counts.set(country, cur)
      }
      for (const v of [...counts.values()].sort((a, b) => b.n - a.n)) {
        rows.push({ country: v.country, code: v.code ? `+${v.code}` : '', contacts: String(v.n) })
      }
    } else if (kind === 'stats') {
      const users = chats.filter(isUserChat)
      const groups = chats.filter((c) => c.id?.server === 'g.us')
      const now = Date.now() / 1000
      const stat = (key: string, value: number) => rows.push({ key, value: String(value) })
      stat('chats', chats.length)
      stat('users', users.length)
      stat('groups', groups.length)
      stat('unread', chats.filter((c) => (c.unreadCount ?? 0) > 0).length)
      stat('unreadMessages', chats.reduce((n, c) => n + Math.max(0, c.unreadCount ?? 0), 0))
      stat('archived', chats.filter((c) => c.archive).length)
      stat('pinned', chats.filter((c) => (c.pin ?? 0) > 0).length)
      stat('muted', chats.filter((c) => (c.muteExpiration ?? 0) !== 0 && ((c.muteExpiration ?? 0) < 0 || (c.muteExpiration ?? 0) > now)).length)
      stat('contacts', contacts.filter((c) => c.isMyContact && c.id?.server === 'c.us').length)
      stat('unsaved', users.filter((c) => !c.contact?.isMyContact).length)
      stat('business', contacts.filter((c) => c.isBusiness).length)
      stat('groupMembers', groups.reduce((n, c) => n + participantCount(c), 0))
    }
  } catch {
    /* WPP not ready */
  }
  return rows
}

async function handleCmd(cmd: string, payload: unknown): Promise<void> {
  await whenReady()
  const wpp = getWpp()
  if (!wpp) return

  if (cmd === 'syncState') {
    if (!payload || typeof payload !== 'object') {
      stopPrivacy()
      return
    }
    const p = payload as { values: Record<string, unknown>; data: unknown }
    const state = { enabled: true, values: p.values, data: p.data } as import('@/core/sites/whatsapp').WhatsappPlusState
    startPrivacy(state)
    return
  }

  if (cmd === 'startChat' && payload && typeof payload === 'object') {
    const num = String((payload as { number: string }).number).replace(/\D/g, '')
    if (num && wpp.chat?.openChatBottom) await (wpp.chat.openChatBottom as (id: string) => Promise<unknown>)(`${num}@c.us`)
  }

  if (cmd === 'exportChat' && payload && typeof payload === 'object') {
    const { reqId, options } = payload as { reqId: string; options: ChatExportOptions }
    const chat = await call<ChatLike & { formattedTitle?: string }>(wpp.chat?.getActiveChat)
    const chatId = chat?.id?._serialized
    let file: { filename: string; mime: string; content: string } | null = null
    if (chatId && wpp.chat?.getMessages) {
      const raw =
        (await call<unknown[]>(wpp.chat.getMessages, chatId, { count: 8000 })) ??
        (await call<unknown[]>(wpp.chat.getMessages, chatId)) ??
        []
      const title = chat?.formattedTitle ?? chat?.name ?? 'Chat'
      const normalized = normalizeMessages(raw, options, (author) => {
        const hit = raw.find((m) => {
          const a = (m as { author?: { user?: string } }).author
          return a?.user === author || String(a) === author
        }) as { notifyName?: string } | undefined
        return hit?.notifyName ?? author ?? 'Unknown'
      })
      file = buildChatExportFile(title, normalized, options)
    }
    window.postMessage(
      { [PAGE_EVT_KEY]: 'exportChatResult', payload: { reqId, file } },
      location.origin || '*',
    )
    return
  }

  if (cmd === 'export' && payload && typeof payload === 'object') {
    const kind = String((payload as { kind: string }).kind)
    const rows = await runQuery(wpp, kind)
    window.postMessage({ [PAGE_EVT_KEY]: 'exportResult', payload: rows }, location.origin || '*')
    return
  }

  if (cmd === 'query' && payload && typeof payload === 'object') {
    const { kind, reqId } = payload as { kind: string; reqId: string }
    const rows = await runQuery(wpp, String(kind))
    window.postMessage({ [PAGE_EVT_KEY]: 'queryResult', payload: { reqId, rows } }, location.origin || '*')
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
