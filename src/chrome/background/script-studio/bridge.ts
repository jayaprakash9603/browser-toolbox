import { createLogger } from '@/core/logging'
import { isConnectAllowed } from '@/core/script-studio/connect'
import {
  getScriptCode,
  getScriptStudioSettings,
  getScriptValues,
  parseMetadata,
  setScriptValues,
} from '@/core/script-studio'

import { downloadWithName } from '../downloadNames'

const logger = createLogger('script-studio-bridge')

const sessionConnectAllowed = new Set<string>()
const menuCommands = new Map<string, { scriptId: string; name: string; tabId?: number }>()
const tabState = new Map<number, Record<string, unknown>>()

type GmBridgeMessage = {
  type: 'SS_GM_BRIDGE'
  sub: string
  scriptId: string
  payload: Record<string, unknown>
}

function isBridgeMessage(raw: unknown): raw is GmBridgeMessage {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as GmBridgeMessage).type === 'SS_GM_BRIDGE' &&
    typeof (raw as GmBridgeMessage).sub === 'string'
  )
}

async function scriptConnects(scriptId: string): Promise<string[]> {
  const code = await getScriptCode(scriptId)
  if (!code) return []
  const meta = parseMetadata(code)
  return meta?.connects ?? []
}

export async function handleGmBridge(
  message: GmBridgeMessage,
  sender: chrome.runtime.MessageSender,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const { sub, scriptId, payload } = message
  const tabId = sender.tab?.id

  try {
    switch (sub) {
      case 'setValue': {
        const key = String(payload.key)
        const values = await getScriptValues(scriptId)
        values[key] = payload.value
        await setScriptValues(scriptId, values)
        return { ok: true }
      }
      case 'deleteValue': {
        const values = await getScriptValues(scriptId)
        delete values[String(payload.key)]
        await setScriptValues(scriptId, values)
        return { ok: true }
      }
      case 'xmlhttpRequest': {
        const settings = await getScriptStudioSettings()
        const details = payload.details as Record<string, unknown>
        const url = String(details.url ?? '')
        const connects = await scriptConnects(scriptId)
        if (
          !isConnectAllowed(url, connects, undefined, settings.connectMode, sessionConnectAllowed)
        ) {
          return { ok: false, error: 'Connect not allowed for ' + url }
        }
        const method = (details.method as string) ?? 'GET'
        const headers = (details.headers as Record<string, string>) ?? {}
        const response = await fetch(url, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : (details.data as BodyInit | undefined),
        })
        const responseText = await response.text()
        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((v, k) => {
          responseHeaders[k] = v
        })
        return {
          ok: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            responseText,
            responseHeaders,
            finalUrl: response.url,
            readyState: 4,
          },
        }
      }
      case 'download': {
        const settings = await getScriptStudioSettings()
        if (settings.downloadMode === 'disabled') return { ok: false, error: 'Downloads disabled' }
        const details = payload.details as { url: string; name?: string }
        const name = details.name ?? 'download'
        const ext = name.split('.').pop()?.toLowerCase() ?? ''
        if (ext && !settings.downloadWhitelist.includes(ext)) {
          return { ok: false, error: 'Extension not allowed' }
        }
        await downloadWithName({ url: details.url, filename: name, saveAs: false })
        return { ok: true }
      }
      case 'notification': {
        const details = payload.details as { text?: string; title?: string; tag?: string }
        await chrome.notifications.create(`ss-${scriptId}-${Date.now()}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('public/icons/icon48.png'),
          title: details.title ?? 'Script Studio',
          message: details.text ?? '',
        })
        return { ok: true }
      }
      case 'openInTab': {
        const url = String(payload.url ?? '')
        const options = (payload.options ?? {}) as { active?: boolean; incognito?: boolean }
        const tab = await chrome.tabs.create({ url, active: options.active !== false })
        return { ok: true, data: { id: tab.id, close: () => tab.id && chrome.tabs.remove(tab.id) } }
      }
      case 'registerMenuCommand': {
        const name = String(payload.name ?? '')
        const id = `mc_${scriptId}_${name}`
        menuCommands.set(id, { scriptId, name, tabId })
        return { ok: true, data: id }
      }
      case 'unregisterMenuCommand': {
        menuCommands.delete(String(payload.menuId))
        return { ok: true }
      }
      case 'setClipboard': {
        const data = String(payload.data ?? '')
        if (sender.tab?.id != null) {
          await chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: (text: string) => navigator.clipboard.writeText(text),
            args: [data],
          })
        }
        return { ok: true }
      }
      case 'getTab': {
        if (!tabId) return { ok: true, data: null }
        const tab = await chrome.tabs.get(tabId)
        const saved = tabState.get(tabId) ?? {}
        return { ok: true, data: { ...saved, id: tabId, url: tab.url, title: tab.title } }
      }
      case 'saveTab': {
        if (!tabId) return { ok: true }
        tabState.set(tabId, (payload.tab as Record<string, unknown>) ?? {})
        return { ok: true }
      }
      case 'getTabs': {
        const out: Record<number, unknown> = {}
        tabState.forEach((v, k) => {
          out[k] = v
        })
        return { ok: true, data: out }
      }
      case 'cookie': {
        const settings = await getScriptStudioSettings()
        if (!settings.allowCookieAccess) return { ok: false, error: 'Cookie access disabled' }
        const action = String(payload.action)
        const details = payload.details as chrome.cookies.SetDetails
        if (action === 'list') {
          const list = await chrome.cookies.getAll(details)
          return { ok: true, data: list }
        }
        if (action === 'set') {
          const c = await chrome.cookies.set(details)
          return { ok: true, data: c }
        }
        if (action === 'delete') {
          await chrome.cookies.remove({ url: details.url!, name: details.name! })
          return { ok: true }
        }
        return { ok: false, error: 'Unknown cookie action' }
      }
      default:
        return { ok: true }
    }
  } catch (error) {
    logger.warn('GM bridge error', sub, error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function registerGmBridgeListener(): void {
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    if (!isBridgeMessage(raw)) return false
    void handleGmBridge(raw, sender).then((res) => sendResponse(res))
    return true
  })

  const us = chrome.userScripts as typeof chrome.userScripts & {
    onUserScriptMessage?: {
      addListener: (cb: (message: unknown, sender: chrome.runtime.MessageSender) => void) => void
    }
  }
  us?.onUserScriptMessage?.addListener((message, sender) => {
    if (!isBridgeMessage(message)) return
    void handleGmBridge(message, sender)
  })
}

export function getMenuCommandsForTab(tabId: number) {
  return [...menuCommands.entries()]
    .filter(([, v]) => v.tabId === tabId || v.tabId == null)
    .map(([id, v]) => ({ id, ...v }))
}
