import type { WhatsappPlusState } from '@/core/sites/whatsapp'
import { PAGE_EVT_KEY } from '@/core/sites/whatsapp/constants'

import { postToMain } from './bridge'
import { isFeatureOn } from '@/core/sites/whatsapp/helpers'

import { openAnalyticsDashboard } from './features/analyticsDashboard'
import { applyWhatsappPlus, stopAll } from './manager'

type Guarded = Window & { __toolboxWaEnhancer?: boolean }

function readState(raw: unknown): WhatsappPlusState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as WhatsappPlusState
  if (!o.values || !o.data) return null
  return o
}

function apply(raw: unknown): void {
  const state = readState(raw)
  if (!state?.enabled) {
    stopAll()
    return
  }
  applyWhatsappPlus(state)
}

function showRestored(body: string): void {
  const main = document.querySelector('#main [data-testid="conversation-panel-messages"]')
  if (!main) return
  const el = document.createElement('div')
  el.className = 'tbx-wa-restored-msg'
  el.textContent = `Deleted: ${body}`
  main.appendChild(el)
}

const guarded = window as Guarded
if (!guarded.__toolboxWaEnhancer) {
  guarded.__toolboxWaEnhancer = true
  if (window === window.top) {
    chrome.storage.local.get('whatsappPlus', (result) => apply(result.whatsappPlus))
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.whatsappPlus) apply(changes.whatsappPlus.newValue)
    })

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'WA_SHOW_RESTORED' && msg.body) showRestored(String(msg.body))
      if (msg?.type === 'WA_SEND_TEXT' && msg.chatId && msg.text) {
        postToMain('sendText', { chatId: msg.chatId, text: msg.text })
      }
      if (msg?.type === 'WA_EXPORT_CHAT' && msg.options) {
        const onResult = (payload: unknown) => {
          window.removeEventListener('message', listener)
          const p = payload as { file?: { filename: string; mime: string; content: string } | null }
          sendResponse({ ok: true, file: p?.file ?? null })
        }
        const listener = (e: MessageEvent) => {
          if (e.source !== window) return
          const data = e.data as Record<string, unknown> | null
          if (data && data[PAGE_EVT_KEY] === 'exportChatResult') onResult(data.payload)
        }
        window.addEventListener('message', listener)
        postToMain('exportChat', { reqId: `panel-${Date.now()}`, options: msg.options })
        setTimeout(() => sendResponse({ ok: false, file: null }), 60_000)
        return true
      }
      if (msg?.type === 'WA_OPEN_ANALYTICS') {
        chrome.storage.local.get('whatsappPlus', (result) => {
          const state = readState(result.whatsappPlus)
          if (!state?.enabled || !isFeatureOn(state.values, 'chatPulse')) {
            const t = document.createElement('div')
            t.className = 'tbx-wa-toast'
            t.textContent = 'Enable ChatPulse in ChatBoost'
            document.body.appendChild(t)
            setTimeout(() => t.remove(), 2600)
            return
          }
          openAnalyticsDashboard()
        })
        sendResponse({ ok: true })
        return true
      }
      if (msg?.type === 'WA_EXPORT' && msg.kind) {
        const kind = String(msg.kind)
        const onResult = (event: string, payload: unknown) => {
          if (event !== 'exportResult') return
          window.removeEventListener('message', listener)
          sendResponse({ ok: true, rows: payload })
        }
        const listener = (e: MessageEvent) => {
          if (e.source !== window) return
          const data = e.data as Record<string, unknown> | null
          if (data && data[PAGE_EVT_KEY] === 'exportResult') onResult('exportResult', data.payload)
        }
        window.addEventListener('message', listener)
        postToMain('export', { kind })
        setTimeout(() => sendResponse({ ok: false, rows: [] }), 8000)
        return true
      }
      return undefined
    })

    void chrome.runtime.sendMessage({ type: 'WA_GET_STATUS' }).catch(() => {})
  }
}
