import { resolveRangeMs, type AnalyticsRange, type RawDataset, type RawMessage } from '@/core/sites/whatsapp/analytics'

const URL_RE = /https?:\/\/|www\./i
const CONCURRENCY = 8
const CALL_TIMEOUT_MS = 4000
const MSG_TIMEOUT_MS = 3000

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
}

type Wid = { user?: string; server?: string; _serialized?: string }
type ChatLike = {
  id?: Wid
  name?: string
  formattedTitle?: string
  unreadCount?: number
  isGroup?: boolean
  msgs?: { getModelsArray?: () => unknown[] }
}

function call<T>(fn: unknown, timeoutMs: number, ...args: unknown[]): Promise<T | undefined> {
  if (typeof fn !== 'function') return Promise.resolve(undefined)
  const work = Promise.resolve()
    .then(() => (fn as (...a: unknown[]) => T | Promise<T>)(...args))
    .catch(() => undefined)
  const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs))
  return Promise.race([work, timeout])
}

function perChatCap(range: AnalyticsRange): number {
  if (range === '7d') return 150
  if (range === '30d') return 300
  if (range === '90d') return 500
  return 1000
}

function chatTitle(c: ChatLike): string {
  return c.formattedTitle ?? c.name ?? c.id?.user ?? 'Chat'
}

function serializeMessage(chat: ChatLike, m: Record<string, unknown>): RawMessage | null {
  const t = Number(m.t ?? 0)
  const timestampMs = t > 1e12 ? t : t * 1000
  if (!timestampMs) return null
  const type = String(m.type ?? 'chat')
  const body = String(m.body ?? m.caption ?? '').trim().slice(0, 500)
  const author = (m.author as Wid | undefined)?.user ?? ''
  const id = m.id as { fromMe?: boolean } | undefined
  return {
    chatId: chat.id?._serialized ?? '',
    chatName: chatTitle(chat),
    isGroup: chat.isGroup === true || chat.id?.server === 'g.us',
    fromMe: Boolean(m.fromMe ?? id?.fromMe),
    timestampMs,
    type,
    author,
    authorName: String(m.notifyName ?? ''),
    body: type === 'chat' ? body : body || `[${type}]`,
    hasMedia: type !== 'chat' && type !== 'revoked',
    hasLink: URL_RE.test(body),
  }
}

/** Messages already in memory are instant; WPP fetch fills in older history with a per-chat timeout. */
async function messagesForChat(wpp: WppLike, chat: ChatLike, cap: number, fromMs: number | null): Promise<unknown[]> {
  const inMemory = chat.msgs?.getModelsArray?.() ?? []
  const oldest = inMemory.length ? Number((inMemory[0] as { t?: number }).t ?? 0) * 1000 : Infinity
  if (inMemory.length >= cap || (fromMs != null && oldest <= fromMs)) return inMemory
  const fetched = await call<unknown[]>(wpp.chat.getMessages, MSG_TIMEOUT_MS, chat.id?._serialized, { count: cap })
  return fetched && fetched.length > inMemory.length ? fetched : inMemory
}

async function optionalCount(paths: [object | undefined, string][]): Promise<number | null> {
  for (const [root, key] of paths) {
    if (!root) continue
    const list = await call<unknown[]>((root as Record<string, unknown>)[key], CALL_TIMEOUT_MS)
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
  const cap = perChatCap(range)
  const chats = (await call<ChatLike[]>(wpp.chat.list, 10_000)) ?? []
  const messages: RawMessage[] = []
  let done = 0
  let next = 0

  const worker = async () => {
    while (next < chats.length) {
      const chat = chats[next++]
      if (!chat.id?._serialized) continue
      const batch = await messagesForChat(wpp, chat, cap, fromMs)
      for (const raw of batch) {
        if (!raw || typeof raw !== 'object') continue
        const msg = serializeMessage(chat, raw as Record<string, unknown>)
        if (msg && (fromMs == null || msg.timestampMs >= fromMs)) messages.push(msg)
      }
      done++
      if (done % 10 === 0) onProgress?.(`Analyzed ${messages.length} messages across ${done} of ${chats.length} chats`)
    }
  }

  const sideData = Promise.all([
    call<unknown[]>(wpp.contact?.list, CALL_TIMEOUT_MS),
    call<unknown[]>(wpp.labels?.getAllLabels, CALL_TIMEOUT_MS),
    call<unknown[]>(wpp.blocklist?.all, CALL_TIMEOUT_MS),
    Promise.all([
      optionalCount([[wpp.newsletter, 'list']]),
      optionalCount([[wpp.status, 'list']]),
      optionalCount([[wpp.community, 'list']]),
      optionalCount([[wpp.call, 'list']]),
      optionalCount([[wpp.catalog, 'getProducts']]),
      optionalCount([[wpp.order, 'list']]),
    ]),
  ])

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  onProgress?.(`Analyzed ${messages.length} messages across ${chats.length} chats · finishing…`)
  const [contacts, labels, blocked, [channels, statusPosts, communities, calls, catalogProducts, orders]] = await sideData

  return {
    messages,
    chats: chats.map((c) => ({
      id: c.id?._serialized ?? '',
      name: chatTitle(c),
      isGroup: c.isGroup === true || c.id?.server === 'g.us',
      unreadCount: Math.max(0, c.unreadCount ?? 0),
    })),
    contactCount: (contacts ?? []).filter((c) => (c as { isMyContact?: boolean }).isMyContact).length,
    blockedCount: blocked?.length ?? 0,
    labelCount: labels?.length ?? 0,
    optional: { channels, statusPosts, communities, calls, catalogProducts, orders },
  }
}
