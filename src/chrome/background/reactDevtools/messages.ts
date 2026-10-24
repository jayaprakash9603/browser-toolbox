import {
  REACT_DEVTOOLS_BUILD_FILES,
  REACT_DEVTOOLS_SESSION_DETECTION_KEY,
} from '@/core/reactDevtools/constants'

const BACKEND_VERSION = 'compact'

async function executeScriptInMainWorld(
  tabId: number,
  files: string[],
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files,
    world: 'MAIN',
    injectImmediately: true,
  })
}

async function recordReactDetection(tabId: number, reactBuildType: string): Promise<void> {
  const stored = await chrome.storage.session.get(REACT_DEVTOOLS_SESSION_DETECTION_KEY)
  const map =
    (stored[REACT_DEVTOOLS_SESSION_DETECTION_KEY] as Record<string, string> | undefined) ?? {}
  map[String(tabId)] = reactBuildType
  await chrome.storage.session.set({ [REACT_DEVTOOLS_SESSION_DETECTION_KEY]: map })
}

export function handleReactDevtoolsRuntimeMessage(
  message: { source?: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
): boolean {
  switch (message?.source) {
    case 'devtools-page': {
      handleDevToolsPageMessage(message)
      return false
    }
    case 'react-devtools-fetch-resource-content-script': {
      handleFetchResourceMessage(message)
      return false
    }
    case 'react-devtools-backend-manager': {
      handleBackendManagerMessage(message, sender)
      return false
    }
    case 'react-devtools-hook': {
      void handleHookMessage(message, sender)
      return false
    }
    default:
      return false
  }
}

function handleHookMessage(
  message: { payload?: unknown },
  sender: chrome.runtime.MessageSender,
) {
  const payload = message.payload as { type?: string; reactBuildType?: string } | undefined
  if (payload?.type !== 'react-renderer-attached') return
  const tabId = sender.tab?.id
  if (tabId == null || !payload.reactBuildType) return
  void recordReactDetection(tabId, payload.reactBuildType)
}

function handleBackendManagerMessage(
  message: { payload?: unknown },
  sender: chrome.runtime.MessageSender,
) {
  const payload = message.payload as { type?: string; versions?: string[] } | undefined
  if (payload?.type !== 'require-backends') return
  const tabId = sender.tab?.id
  if (tabId == null) return
  for (const version of payload.versions ?? []) {
    if (version === BACKEND_VERSION) {
      void executeScriptInMainWorld(tabId, [REACT_DEVTOOLS_BUILD_FILES.backendCompact])
    }
  }
}

function handleDevToolsPageMessage(message: { payload?: unknown }) {
  const payload = message.payload as
    | {
        type?: string
        tabId?: number
        url?: string
        requestId?: string
        scriptId?: string
        args?: unknown[]
      }
    | undefined
  if (!payload?.type) return

  switch (payload.type) {
    case 'fetch-file-with-cache': {
      const { tabId, url } = payload
      if (!tabId || !url) {
        chrome.runtime.sendMessage({
          source: 'react-devtools-background',
          payload: { type: 'fetch-file-with-cache-error', url, value: null },
        })
        return
      }
      void chrome.tabs.sendMessage(tabId, {
        source: 'devtools-page',
        payload: { type: 'fetch-file-with-cache', url },
      })
      return
    }
    case 'inject-backend-manager': {
      const tabId = payload.tabId
      if (tabId == null) return
      void executeScriptInMainWorld(tabId, [REACT_DEVTOOLS_BUILD_FILES.backendManager])
      return
    }
    case 'eval-in-inspected-window': {
      const { tabId, requestId, scriptId, args } = payload
      if (tabId == null || requestId == null) return
      void chrome.tabs
        .sendMessage(tabId, {
          source: 'devtools-page-eval',
          payload: { scriptId, args },
        })
        .then((response) => {
          if (!response) {
            chrome.runtime.sendMessage({
              source: 'react-devtools-background',
              payload: {
                type: 'eval-in-inspected-window-response',
                requestId,
                result: null,
                error: 'No response from content script',
              },
            })
            return
          }
          const { result, error } = response as { result?: unknown; error?: string }
          chrome.runtime.sendMessage({
            source: 'react-devtools-background',
            payload: {
              type: 'eval-in-inspected-window-response',
              requestId,
              result,
              error,
            },
          })
        })
        .catch((error: unknown) => {
          chrome.runtime.sendMessage({
            source: 'react-devtools-background',
            payload: {
              type: 'eval-in-inspected-window-response',
              requestId,
              result: null,
              error: error instanceof Error ? error.message : String(error),
            },
          })
        })
      return
    }
  }
}

function handleFetchResourceMessage(message: { payload?: unknown }) {
  const payload = message.payload as { type?: string; url?: string; value?: unknown } | undefined
  if (
    payload?.type === 'fetch-file-with-cache-complete' ||
    payload?.type === 'fetch-file-with-cache-error'
  ) {
    chrome.runtime.sendMessage({
      source: 'react-devtools-background',
      payload,
    })
  }
}
