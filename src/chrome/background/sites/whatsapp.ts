import {
  applyTemplateVariables,
  getWhatsappPlusState,
  isWithinWorkingHours,
  matchesSmartReply,
  randomDelayMs,
  spinText,
  updateWhatsappPlusState,
  type WaRuntimeStatus,
} from '@/core/sites/whatsapp'
import { STORAGE_KEYS } from '@/core/constants'
import { registerMessageHandler } from '@/core/messaging'

import { injectWhatsappIntoOpenTabs, syncWhatsappContentScripts } from './whatsappContentScripts'

const deletedCache = new Map<string, { body: string; at: number }>()
let lastRuntimeStatus: WaRuntimeStatus = 'no_tab'
let broadcastRunning = false

export async function syncWhatsappPlusState(): Promise<void> {
  const state = await getWhatsappPlusState()
  await syncWhatsappContentScripts(state)
  await injectWhatsappIntoOpenTabs(state)
}

async function getWhatsappTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ url: ['*://web.whatsapp.com/*'], active: true, currentWindow: true })
  if (tabs[0]?.id != null) return tabs[0].id
  const any = await chrome.tabs.query({ url: ['*://web.whatsapp.com/*'] })
  return any[0]?.id ?? null
}

export function registerSitesWhatsapp(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.whatsappPlus]) void syncWhatsappPlusState()
  })

  registerMessageHandler('WA_OPEN_PANEL', async (_message, sender) => {
    const tabId = sender.tab?.id
    if (tabId == null) return { opened: false }
    await chrome.sidePanel.open({ tabId })
    return { opened: true }
  })

  registerMessageHandler('WA_GET_STATUS', async () => {
    const tabId = await getWhatsappTabId()
    if (tabId == null) return { status: 'no_tab' as const }
    return { status: lastRuntimeStatus }
  })

  registerMessageHandler('WA_RUNTIME_STATUS', async (message) => {
    if (message.type !== 'WA_RUNTIME_STATUS') return null
    lastRuntimeStatus = message.status === 'ready' ? 'ready' : 'not_logged_in'
    return null
  })

  registerMessageHandler('WA_CACHE_MESSAGE', async (message) => {
    if (message.type !== 'WA_CACHE_MESSAGE') return null
    const msg = message.payload as { id?: { id?: string }; body?: string; caption?: string } | undefined
    const id = msg?.id?.id
    const body = msg?.body ?? msg?.caption ?? ''
    if (id && body) deletedCache.set(id, { body, at: Date.now() })
    return null
  })

  registerMessageHandler('WA_MESSAGE_REVOKED', async (message) => {
    if (message.type !== 'WA_MESSAGE_REVOKED') return null
    const data = message.payload as { id?: { id?: string }; refId?: string } | undefined
    const id = data?.refId ?? data?.id?.id
    if (!id) return null
    const cached = deletedCache.get(id)
    if (!cached) return null
    const tabId = await getWhatsappTabId()
    if (tabId != null) {
      await chrome.tabs.sendMessage(tabId, { type: 'WA_SHOW_RESTORED', body: cached.body })
    }
    return null
  })

  registerMessageHandler('WA_PRESENCE', async (message) => {
    if (message.type !== 'WA_PRESENCE') return null
    const p = message.payload as { notifyOnline?: boolean; notifyTyping?: boolean; data?: unknown }
    const state = await getWhatsappPlusState()
    if (!state.enabled) return null
    if (p.notifyOnline || p.notifyTyping) {
      chrome.notifications.create(`wa-presence-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'public/icons/icon128.png',
        title: 'WhatsApp activity',
        message: 'Contact presence changed',
      })
    }
    return null
  })

  registerMessageHandler('WA_SMART_REPLY_CHECK', async (message) => {
    if (message.type !== 'WA_SMART_REPLY_CHECK') return null
    const state = await getWhatsappPlusState()
    const text = String((message.payload as { text?: string })?.text ?? '')
    for (const rule of state.data.smartReplies) {
      if (!rule.enabled) continue
      if (matchesSmartReply(text, rule.pattern, rule.isRegex)) {
        return { reply: applyTemplateVariables(rule.reply, {}) }
      }
    }
    return null
  })

  registerMessageHandler('WA_RUN_BROADCAST', async (message) => {
    if (message.type !== 'WA_RUN_BROADCAST') return null
    void runBroadcastStep(message.campaignId)
    return { ok: true }
  })

  registerMessageHandler('WA_FIRE_WEBHOOK', async (message) => {
    if (message.type !== 'WA_FIRE_WEBHOOK') return null
    const state = await getWhatsappPlusState()
    for (const hook of state.data.webhooks.filter((h) => h.enabled)) {
      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: message.event, payload: message.payload }),
        })
      } catch {
        /* ignore */
      }
    }
    return { ok: true }
  })

  registerMessageHandler('WA_EXPORT_CHAT', async (message) => {
    if (message.type !== 'WA_EXPORT_CHAT') return null
    const tabId = await getWhatsappTabId()
    if (tabId == null) return { ok: false, error: 'no_tab' }
    const res = await chrome.tabs.sendMessage(tabId, { type: 'WA_EXPORT_CHAT', options: message.options })
    return res ?? { ok: false }
  })

  registerMessageHandler('WA_EXPORT', async (message) => {
    if (message.type !== 'WA_EXPORT') return null
    const tabId = await getWhatsappTabId()
    if (tabId == null) return { ok: false, error: 'no_tab' }
    const res = await chrome.tabs.sendMessage(tabId, { type: 'WA_EXPORT', kind: message.kind })
    return res ?? { ok: false }
  })

  registerMessageHandler('WA_OPEN_ANALYTICS', async () => {
    const tabId = await getWhatsappTabId()
    if (tabId == null) return { ok: false, error: 'no_tab' }
    await chrome.tabs.sendMessage(tabId, { type: 'WA_OPEN_ANALYTICS' })
    return { ok: true }
  })

  registerMessageHandler('WA_TRANSLATE', async (message) => {
    if (message.type !== 'WA_TRANSLATE') return null
    const target = message.target || 'en'
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(message.text.slice(0, 4500))}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`translate ${res.status}`)
    const json = (await res.json()) as [[string, string][] | null, unknown, string?]
    const text = (json[0] ?? []).map((part) => part[0]).join('')
    return { text, source: typeof json[2] === 'string' ? json[2] : '' }
  })

  chrome.alarms.create('wa-schedule', { periodInMinutes: 1 })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== 'wa-schedule') return
    void (async () => {
      const state = await getWhatsappPlusState()
      const now = Date.now()
      const tabId = await getWhatsappTabId()
      const scheduled = [...state.data.scheduled]
      let changed = false
      for (const job of scheduled) {
        if (job.status !== 'pending' || job.fireAt > now) continue
        changed = true
        if (tabId != null) {
          await chrome.tabs.sendMessage(tabId, { type: 'WA_SEND_TEXT', chatId: job.chatId, text: job.body })
          job.status = 'sent'
        } else {
          job.status = 'missed'
        }
      }
      if (changed) await updateWhatsappPlusState({ data: { scheduled } })
    })()
  })

  void syncWhatsappPlusState()
}

export async function runBroadcastStep(campaignId: string): Promise<void> {
  if (broadcastRunning) return
  const state = await getWhatsappPlusState()
  const campaign = state.data.campaigns.find((c) => c.id === campaignId)
  if (!campaign || campaign.status !== 'running') return
  if (campaign.respectWorkingHours && !isWithinWorkingHours(campaign.workingHoursStart, campaign.workingHoursEnd)) {
    return
  }
  broadcastRunning = true
  try {
    const tabId = await getWhatsappTabId()
    if (!tabId) return
    const body = spinText(applyTemplateVariables(campaign.message, {}))
    await chrome.tabs.sendMessage(tabId, { type: 'WA_SEND_TEXT', chatId: campaign.recipientRef, text: body })
    campaign.sent += 1
    if (campaign.sent >= campaign.total) campaign.status = 'done'
    await updateWhatsappPlusState({ data: { campaigns: state.data.campaigns } })
    const delay = randomDelayMs(campaign.delayMinSec, campaign.delayMaxSec)
    setTimeout(() => {
      broadcastRunning = false
      if (campaign.status === 'running') void runBroadcastStep(campaignId)
    }, delay)
  } finally {
    broadcastRunning = false
  }
}
