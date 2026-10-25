import { buildScriptSource } from './metadata'
import type { ParsedMetadata } from './types'

export function formatTemplateDatetime(): string {
  return new Date().toISOString()
}

export function applyTemplateVariables(text: string): string {
  return text.replace(/\$DATETIME\$/g, formatTemplateDatetime())
}

export function newScriptTemplate(name = 'My Script'): string {
  const meta: ParsedMetadata = {
    name: { en: name },
    namespace: 'https://one-panel.local/script-studio',
    version: '0.1.0',
    description: { en: 'Describe what this script does' },
    author: '',
    grants: ['GM_addStyle', 'GM_setValue', 'GM_getValue'],
    requires: [],
    resources: [],
    includes: [],
    matches: ['*://*/*'],
    excludes: [],
    connects: [],
    tags: [],
    runAt: 'document-idle',
    runIn: ['normal-tabs'],
    antifeatures: [],
    rawLines: [],
  }
  const body = `// Created $DATETIME$

(function () {
  'use strict';
  GM_addStyle(\`
    /* your styles */
  \`);
})();
`
  return applyTemplateVariables(buildScriptSource(meta, body))
}
