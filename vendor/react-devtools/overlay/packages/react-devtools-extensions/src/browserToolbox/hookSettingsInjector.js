/* global chrome */
/** @flow */

import type {UnknownMessageEvent} from '../contentScripts/messages';
import type {
  DevToolsHookSettings,
} from 'react-devtools-shared/src/backend/types';
import type {ComponentFilter} from 'react-devtools-shared/src/frontend/types';
import {postMessage} from '../contentScripts/messages';

import {getDefaultComponentFilters} from 'react-devtools-shared/src/utils';

const BT_HOOK_SETTINGS_KEY = 'reactDevtoolsHookSettings';

async function messageListener(event: UnknownMessageEvent) {
  if (event.source !== window) {
    return;
  }

  if (event.data.source === 'react-devtools-hook-installer') {
    if (event.data.payload.handshake) {
      const stored = await chrome.storage.local.get(BT_HOOK_SETTINGS_KEY);
      const settings = stored[BT_HOOK_SETTINGS_KEY] || {};
      const hookSettings: DevToolsHookSettings = {
        appendComponentStack:
          typeof settings.appendComponentStack === 'boolean'
            ? settings.appendComponentStack
            : true,
        breakOnConsoleErrors:
          typeof settings.breakOnConsoleErrors === 'boolean'
            ? settings.breakOnConsoleErrors
            : false,
        showInlineWarningsAndErrors:
          typeof settings.showInlineWarningsAndErrors === 'boolean'
            ? settings.showInlineWarningsAndErrors
            : true,
        hideConsoleLogsInStrictMode:
          typeof settings.hideConsoleLogsInStrictMode === 'boolean'
            ? settings.hideConsoleLogsInStrictMode
            : false,
        disableSecondConsoleLogDimmingInStrictMode:
          typeof settings.disableSecondConsoleLogDimmingInStrictMode ===
          'boolean'
            ? settings.disableSecondConsoleLogDimmingInStrictMode
            : false,
      };
      const componentFilters: Array<ComponentFilter> = Array.isArray(
        settings.componentFilters,
      )
        ? settings.componentFilters
        : getDefaultComponentFilters();

      postMessage({
        source: 'react-devtools-settings-injector',
        payload: {hookSettings, componentFilters},
      });

      window.removeEventListener('message', messageListener);
    }
  }
}

window.addEventListener('message', messageListener);
postMessage({
  source: 'react-devtools-settings-injector',
  payload: {handshake: true},
});
