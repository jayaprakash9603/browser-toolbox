import {
  REACT_DEVTOOLS_BUILD_FILES,
  REACT_DEVTOOLS_OWNED_SCRIPT_IDS,
  REACT_DEVTOOLS_SCRIPT_IDS,
} from '@/core/reactDevtools/constants'
import type { ReactDevtoolsState } from '@/core/reactDevtools/state'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('react-devtools-scripts')

export function buildReactDevtoolsContentScripts(
  state: ReactDevtoolsState,
): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  const matches = ['<all_urls>']
  return [
    {
      id: REACT_DEVTOOLS_SCRIPT_IDS.proxy,
      js: [REACT_DEVTOOLS_BUILD_FILES.proxy],
      matches,
      runAt: 'document_start',
      allFrames: true,
      world: 'ISOLATED',
    },
    {
      id: REACT_DEVTOOLS_SCRIPT_IDS.fileFetcher,
      js: [REACT_DEVTOOLS_BUILD_FILES.fileFetcher],
      matches,
      runAt: 'document_end',
      allFrames: true,
      world: 'ISOLATED',
    },
    {
      id: REACT_DEVTOOLS_SCRIPT_IDS.prepareInjection,
      js: [REACT_DEVTOOLS_BUILD_FILES.prepareInjection],
      matches,
      runAt: 'document_start',
      allFrames: true,
    },
    {
      id: REACT_DEVTOOLS_SCRIPT_IDS.fallbackEvalContext,
      js: [REACT_DEVTOOLS_BUILD_FILES.fallbackEvalContext],
      matches,
      runAt: 'document_start',
      allFrames: true,
      world: 'MAIN',
    },
    {
      id: REACT_DEVTOOLS_SCRIPT_IDS.installHook,
      js: [REACT_DEVTOOLS_BUILD_FILES.installHook],
      matches,
      runAt: 'document_start',
      allFrames: true,
      world: 'MAIN',
    },
    {
      id: REACT_DEVTOOLS_SCRIPT_IDS.hookSettingsInjector,
      js: [REACT_DEVTOOLS_BUILD_FILES.hookSettingsInjector],
      matches,
      runAt: 'document_start',
      allFrames: true,
    },
  ]
}

export async function syncReactDevtoolsContentScripts(state: ReactDevtoolsState): Promise<void> {
  const scripts = buildReactDevtoolsContentScripts(state)
  try {
    await reconcileContentScripts([...REACT_DEVTOOLS_OWNED_SCRIPT_IDS], scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}
