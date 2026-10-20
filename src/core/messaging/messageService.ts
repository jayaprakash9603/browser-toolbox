import { createLogger } from '@/core/logging'

import { isExtensionMessage, type ExtensionMessage, type ExtensionResponse } from './types'

const logger = createLogger('messaging')

type MessageHandler = (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
) => Promise<unknown> | unknown

const handlers = new Map<ExtensionMessage['type'], MessageHandler>()

export function registerMessageHandler(type: ExtensionMessage['type'], handler: MessageHandler) {
  if (handlers.has(type)) {
    logger.warn('duplicate message handler', type)
  }
  handlers.set(type, handler)
}

export async function sendMessage<T>(message: ExtensionMessage): Promise<T | undefined> {
  try {
    const response = (await chrome.runtime.sendMessage(message)) as ExtensionResponse<T> | undefined
    if (!response) return undefined
    if (!response.ok) {
      logger.warn('message failed', message.type, response.error)
      return undefined
    }
    return response.data
  } catch (error) {
    logger.warn('sendMessage error', message.type, error)
    return undefined
  }
}

export function startMessageRouter() {
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    if (!isExtensionMessage(raw)) return false
    const handler = handlers.get(raw.type)
    if (!handler) return false
    Promise.resolve()
      .then(() => handler(raw, sender))
      .then((data) => sendResponse({ ok: true, data } satisfies ExtensionResponse))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'unknown error',
        } satisfies ExtensionResponse),
      )
    return true
  })
}
