import { resolveRangeMs, type AnalyticsRange, type RawDataset, type RawMessage } from '@/core/sites/whatsapp/analytics'

const PER_CHAT_CAP = 1000
const URL_RE = /https?:\/\/|www\./i

export type WppLike = {
  chat: Record<string, unknown>
  contact?: Record<string, unknown>
  labels?: Record<string, unknown>
  blocklist?: Record<string, unknown>
  newsletter?: Record<string, unknown>
  status?: Record<string, unknown>
  call?: Record<string, unknown>
  community?: Record<string, unknown>
  catalog?: Record<string, unknown>
  order?: Record<string, unknown>
  whatsapp?: { Collection?: { models?: unknown[] } }
}

type Wid = { user?: string; server?: string; _serialized?: string }
type ChatLike = {
  id?: Wid
  name?: string
  formattedTitle?: string
  unreadCount?: number
  isGroup?: boolean
}

function call<T>(fn: unknown, ...args: unknown[]): Promise<T | undefined> {
  if (typeof fn !== 'function') return Promise.resolve(undefined)
  return Promise.resolve((fn as (...a: unknown[]) => T | Promise<T>)(...args)).catch(() => undefined)
}

function chatTitle(c: ChatLike): string {
  return c.formattedTitle ?? c.name ?? c.id?.user ?? 'Chat'
}

function serializeMessage(chat: ChatLike, m: Record<string, unknown>): RawMessage | null {
  const t = Number(m.t ?? 0)
  const timestampMs = t > 1e12 ? t : t * 1000
  if (!timestampMs) return null
  const body = String(m.body ?? m.caption ?? '').trim().slice(0, 2000)
  const type = String(m.type ?? 'chat')
  const author = (m.author as Wid | undefined)?.user ?? String(m.author ?? '')
  const authorName = String(m.notifyName ?? m.pushName ?? '')
  const hasMedia = Boolean(m.isMedia || m.mediaData || type !== 'chat')
  return {
    chatId: chat.id?._serialized ?? '',
    chatName: chatTitle(chat),
    isGroup: chat.isGroup === true || chat.id?.server === 'g.us',
    fromMe: Boolean(m.fromMe),
    timestampMs,
    type,
    author,
    authorName,
    body: body || (type !== 'chat' ? `[${type}]` : ''),
    hasMedia,
    hasLink: URL_RE.test(body),
  }
}

async function optionalCount(paths: [object | undefined, string][]): Promise<number | null> {
  for (const [root, key] of paths) {
    if (!root) continue
    const fn = (root as Record<string, unknown>)[key]
    const list = await call<unknown[]>(fn)
    if (Array.isArray(list)) return list.length
  }
  return null
}

export async function collectAnalytics(
  wpp: WppLike,
  range: AnalyticsRange,
  onProgress?: (message: string) => void,
): Promise<RawDataset> {
  const { fromMs } = resolveRangeMs(range)
  const chats = (await call<ChatLike[]>(wpp.chat.list)) ?? []
  const messages: RawMessage[] = []
  let analyzedChats = 0

  for (const chat of chats) {
    const chatId = chat.id?._serialized
    if (!chatId || !wpp.chat.getMessages) continue
    let batch = (await call<unknown[]>(wpp.chat.getMessages, chatId, { count: PER_CHAT_CAP })) ?? []
    if (!batch.length) batch = (await call<unknown[]>(wpp.chat.getMessages, chatId)) ?? []
    for (const raw of batch) {
      if (!raw || typeof raw !== 'object') continue
      const row = raw as Record<string, unknown>
      const msg = serializeMessage(chat, row)
      if (!msg) continue
      if (fromMs != null && msg.timestampMs < fromMs) continue
      messages.push(msg)
    }
    analyzedChats++
    if (analyzedChats % 5 === 0 || analyzedChats === chats.length) {
      onProgress?.(`Analyzed ${messages.length} messages across ${analyzedChats} chats`)
    }
  }

  const contacts = (await call<unknown[]>(wpp.contact?.list)) ?? []
  const contactCount = contacts.filter((c) => (c as { isMyContact?: boolean }).isMyContact).length
  const labels = (await call<unknown[]>(wpp.labels?.getAllLabels)) ?? []
  const blocked = (await call<unknown[]>(wpp.blocklist?.all)) ?? []

  const optional = {
    channels: await optionalCount([[wpp.newsletter, 'getSubscribers'], [wpp.newsletter, 'list']]),
    statusPosts: await optionalCount([[wpp.status, 'list'], [wpp.status, 'get']]),
    communities: await optionalCount([[wpp.community, 'list'], [wpp.community, 'getAll']]),
    calls: await optionalCount([[wpp.call, 'list'], [wpp.call, 'getCalls']]),
    catalogProducts: await optionalCount([[wpp.catalog, 'getProducts'], [wpp.catalog, 'list']]),
    orders: await optionalCount([[wpp.order, 'list'], [wpp.order, 'getAll']]),
  }

  return {
    messages,
    chats: chats.map((c) => ({
      id: c.id?._serialized ?? '',
      name: chatTitle(c),
      isGroup: c.isGroup === true || c.id?.server === 'g.us',
      unreadCount: Math.max(0, c.unreadCount ?? 0),
    })),
    contactCount,
    blockedCount: blocked.length,
    labelCount: labels.length,
    optional,
  }
}
