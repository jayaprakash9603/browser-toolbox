import { normalizeGrants, usesSandbox } from './grants'
import { buildMatchPlan, mergeUrlRules, urlMatchesPlan } from './match'
import { extractMetadataBlock, parseMetadata, pickLocalized } from './metadata'
import type { ExternalCacheEntry, ParsedMetadata, RunAt, ScriptRecord, ScriptStudioSettings } from './types'

export type BuiltScriptBundle = {
  scriptId: string
  userScriptId: string
  matches: string[]
  excludeMatches: string[]
  includeGlobs: string[]
  excludeGlobs: string[]
  runAt: 'document_start' | 'document_end' | 'document_idle'
  world: 'MAIN' | 'USER_SCRIPT'
  allFrames: boolean
  code: string
  contextMenuOnly: boolean
}

function runAtToChrome(runAt: RunAt): 'document_start' | 'document_end' | 'document_idle' {
  switch (runAt) {
    case 'document-start':
      return 'document_start'
    case 'document-body':
    case 'document-end':
      return 'document_end'
    case 'document-idle':
      return 'document_idle'
    default:
      return 'document_idle'
  }
}

export function buildGmInfo(
  record: ScriptRecord,
  meta: ParsedMetadata,
  handlerVersion: string,
): Record<string, unknown> {
  return {
    scriptHandler: 'Script Studio',
    version: handlerVersion,
    script: {
      name: pickLocalized(meta.name),
      namespace: meta.namespace,
      version: meta.version,
      description: pickLocalized(meta.description),
      author: meta.author,
      grant: normalizeGrants(meta.grants),
      connect: meta.connects,
      resources: meta.resources.map((r) => ({ name: r.name, url: r.url })),
      matches: meta.matches,
      includes: meta.includes,
      excludes: meta.excludes,
      runAt: meta.runAt,
      downloadURL: meta.downloadUrl,
      updateURL: meta.updateUrl,
      supportURL: meta.supportUrl,
      options: { override: record.overrides },
    },
    scriptMetaStr: meta.rawLines.join('\n'),
    scriptWillUpdate: Boolean(meta.updateUrl || meta.downloadUrl),
    scriptUUID: record.uuid,
  }
}

export function resourcesMapFromCache(entries: ExternalCacheEntry[]): Record<string, { text?: string }> {
  const map: Record<string, { text?: string }> = {}
  for (const e of entries) {
    if (e.kind === 'resource' && e.name) map[e.name] = { text: e.content }
  }
  return map
}

export const SS_RELAY_ID = 'ss-__relay'

export function reportEventNames(nonce: string): { report: string; ack: string } {
  return { report: `__ss_report_${nonce}`, ack: `__ss_ack_${nonce}` }
}

/**
 * USER_SCRIPT-world scripts can message the extension directly. MAIN-world scripts cannot, so they hand
 * their result to the relay script over a DOM event and retry until it acknowledges.
 */
function reporterSource(world: 'MAIN' | 'USER_SCRIPT', nonce: string): string {
  const head =
    'var __ssT0=Date.now();function __ssPayload(s,e){return{status:s,error:e?String((e&&e.stack)||e).slice(0,4000):undefined,' +
    'durationMs:Date.now()-__ssT0,url:location.href,top:window===window.top}}'
  if (world === 'USER_SCRIPT') {
    return `${head}function __ssReport(s,e){try{chrome.runtime.sendMessage({type:'SS_GM_BRIDGE',sub:'report',scriptId:__SS_SCRIPT_ID__,payload:__ssPayload(s,e)})}catch(_){}}`
  }
  const { report, ack } = reportEventNames(nonce)
  return (
    `${head}function __ssReport(s,e){var p=__ssPayload(s,e);p.scriptId=__SS_SCRIPT_ID__;p.seq=String(Math.random());` +
    `var d=JSON.stringify(p),done=false,n=0;function onAck(ev){if(ev.detail===p.seq){done=true;document.removeEventListener(${JSON.stringify(ack)},onAck)}}` +
    `document.addEventListener(${JSON.stringify(ack)},onAck);(function send(){if(done||n++>30)return;` +
    `document.dispatchEvent(new CustomEvent(${JSON.stringify(report)},{detail:d}));setTimeout(send,100)})()}`
  )
}

export function buildRelaySource(nonce: string): string {
  const { report, ack } = reportEventNames(nonce)
  return (
    `document.addEventListener(${JSON.stringify(report)},function(e){var d;try{d=JSON.parse(e.detail)}catch(_){return}` +
    `if(!d||typeof d.scriptId!=='string')return;document.dispatchEvent(new CustomEvent(${JSON.stringify(ack)},{detail:d.seq}));` +
    `try{chrome.runtime.sendMessage({type:'SS_GM_BRIDGE',sub:'report',scriptId:d.scriptId,payload:d})}catch(_){}},true);`
  )
}

export function assembleUserScriptCode(opts: {
  scriptId: string
  grants: string[]
  gmInfo: Record<string, unknown>
  values: Record<string, unknown>
  resources: Record<string, { text?: string }>
  runtimeJs: string
  requireSnippets: string[]
  body: string
  urlGuard?: string
  world?: 'MAIN' | 'USER_SCRIPT'
  reportNonce?: string
}): string {
  const guard = opts.urlGuard ? `if(${opts.urlGuard})` : ''
  const parts = [
    `var __SS_SCRIPT_ID__=${JSON.stringify(opts.scriptId)};`,
    `var __SS_GRANTS__=${JSON.stringify(opts.grants)};`,
    `var __SS_GM_INFO__=${JSON.stringify(opts.gmInfo)};`,
    `var __SS_VALUES__=${JSON.stringify(opts.values)};`,
    `var __SS_RESOURCES__=${JSON.stringify(opts.resources)};`,
    reporterSource(opts.world ?? 'USER_SCRIPT', opts.reportNonce ?? 'local'),
    `${guard}{`,
    opts.runtimeJs,
    ...opts.requireSnippets,
    'try{(function(){',
    opts.body,
    '\n}).call(window);__ssReport("ok")}catch(__ssErr){__ssReport("error",__ssErr);throw __ssErr}',
    '}',
  ]
  return parts.filter(Boolean).join('\n')
}

export function scriptBodyFromSource(source: string): string {
  const extracted = extractMetadataBlock(source)
  return extracted?.body ?? source
}

export function buildRegistrationBundle(
  record: ScriptRecord,
  source: string,
  values: Record<string, unknown>,
  externals: ExternalCacheEntry[],
  runtimeJs: string,
  settings: ScriptStudioSettings,
  handlerVersion: string,
  reportNonce = 'local',
): BuiltScriptBundle | null {
  const meta = parseMetadata(source)
  if (!meta) return null

  const runAt = (record.overrides.runAt ?? meta.runAt) as RunAt
  if (runAt === 'context-menu') {
    return {
      scriptId: record.id,
      userScriptId: `ss-${record.id}`,
      matches: ['<all_urls>'],
      excludeMatches: ['*://*/*'],
      includeGlobs: [],
      excludeGlobs: [],
      runAt: 'document_idle',
      world: 'USER_SCRIPT',
      allFrames: settings.runInSubframes,
      code: '',
      contextMenuOnly: true,
    }
  }

  const merged = mergeUrlRules(
    meta.matches,
    meta.includes,
    meta.excludes,
    record.overrides.userMatches,
    record.overrides.userIncludes,
    record.overrides.userExcludes,
    record.overrides.keepOriginalMatches ?? true,
    record.overrides.keepOriginalIncludes ?? true,
    record.overrides.keepOriginalExcludes ?? true,
  )

  for (const blocker of record.overrides.siteBlockers ?? []) {
    merged.excludes.push(blocker)
  }

  const plan = buildMatchPlan(merged.matches, merged.includes, merged.excludes)
  const grants = normalizeGrants(meta.grants)
  const sandbox = record.overrides.sandbox ?? meta.sandbox ?? 'JavaScript'
  const useMain = sandbox === 'raw' || grants.includes('none') || !usesSandbox(grants)

  const requireSnippets = externals
    .filter((e) => e.kind === 'require')
    .map((e) => e.content)
  const body = scriptBodyFromSource(source)
  const gmInfo = buildGmInfo(record, meta, handlerVersion)

  let urlGuard = ''
  if (plan.runtimeInclude.length || plan.runtimeExclude.length) {
    urlGuard = `(function(){var u=location.href;var ok=${JSON.stringify(plan.runtimeInclude)};var bad=${JSON.stringify(plan.runtimeExclude)};function re(p){try{if(p[0]==='/'){var i=p.lastIndexOf('/');return new RegExp(p.slice(1,i),p.slice(i+1)).test(u);}return false;}catch(e){return false;}}for(var i=0;i<bad.length;i++)if(re(bad[i]))return false;if(!ok.length)return true;for(var j=0;j<ok.length;j++)if(re(ok[j]))return true;return false;})()`
  }

  const world = useMain ? 'MAIN' : 'USER_SCRIPT'
  const code = assembleUserScriptCode({
    scriptId: record.id,
    grants,
    gmInfo,
    values,
    resources: resourcesMapFromCache(externals),
    runtimeJs,
    requireSnippets,
    body,
    urlGuard,
    world,
    reportNonce,
  })

  return {
    scriptId: record.id,
    userScriptId: `ss-${record.id}`,
    matches: plan.matches.length ? plan.matches : ['*://*/*'],
    excludeMatches: plan.excludeMatches,
    includeGlobs: plan.includeGlobs,
    excludeGlobs: plan.excludeGlobs,
    runAt: runAtToChrome(runAt),
    world,
    allFrames: settings.runInSubframes && !meta.noframes && !record.overrides.noframes,
    code,
    contextMenuOnly: false,
  }
}

export function scriptMatchesUrl(
  record: ScriptRecord,
  source: string,
  url: string,
  settings: ScriptStudioSettings,
): boolean {
  const meta = parseMetadata(source)
  if (!meta) return false
  const merged = mergeUrlRules(
    meta.matches,
    meta.includes,
    meta.excludes,
    record.overrides.userMatches,
    record.overrides.userIncludes,
    record.overrides.userExcludes,
    record.overrides.keepOriginalMatches ?? true,
    record.overrides.keepOriginalIncludes ?? true,
    record.overrides.keepOriginalExcludes ?? true,
  )
  const plan = buildMatchPlan(merged.matches, merged.includes, merged.excludes)
  if (!settings.runOnFileUrls && url.startsWith('file:')) return false
  return urlMatchesPlan(url, plan)
}

export function userScriptFingerprint(bundle: BuiltScriptBundle): string {
  return JSON.stringify({
    id: bundle.userScriptId,
    matches: bundle.matches,
    excludeMatches: bundle.excludeMatches,
    runAt: bundle.runAt,
    world: bundle.world,
    allFrames: bundle.allFrames,
    codeLen: bundle.code.length,
    contextMenuOnly: bundle.contextMenuOnly,
  })
}
