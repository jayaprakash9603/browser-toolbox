import { bloomHasBase64, type Base64Bloom } from '@/core/adblock/bloom'
import { hostCandidates, hostShard } from '@/core/adblock/shard'

import { SCRIPTLET_ATTR, SCRIPTLET_EVENT, type ScriptletCall } from './protocol'

/** `[rulesetIndex, name, args, excludedHosts?]`; `0` marks a host where `#@#+js()` disables all. */
type Entry = [number, string, string[], string[]?]
export type ScriptletShard = Record<string, Entry[] | 0>

declare global {
  /** Set by the generated bloom.js and cfg/*.js files listed before this one in the registration. */
  var tbxScriptletBloom: Base64Bloom | undefined
  var tbxScriptletRulesets: number[] | undefined
}

/**
 * Scriptlets for `host`. Almost every page stops at the bloom check; only listed hosts (and rare
 * false positives) read the few-kilobyte shard that holds their entries.
 */
export function selectScriptlets(
  host: string,
  bloom: Base64Bloom,
  rulesets: number[],
  loadShard: (index: number) => ScriptletShard,
): ScriptletCall[] {
  const candidates = hostCandidates(host.replace(/\.$/, ''))
  const hits = candidates.filter((candidate) => bloomHasBase64(bloom, candidate))
  if (!hits.length) return []
  const shards = new Map<number, ScriptletShard>()
  const entries: Entry[] = []
  for (const candidate of hits) {
    const index = hostShard(candidate)
    if (!shards.has(index)) shards.set(index, loadShard(index))
    const value = shards.get(index)?.[candidate]
    if (value === 0) return []
    if (value) entries.push(...value)
  }
  const enabled = new Set(rulesets)
  const seen = new Set<string>()
  const calls: ScriptletCall[] = []
  for (const [ruleset, name, args, excluded] of entries) {
    if (!enabled.has(ruleset)) continue
    if (excluded?.some((hostname) => candidates.includes(hostname))) continue
    const key = `${name}\u0000${JSON.stringify(args)}`
    if (seen.has(key)) continue
    seen.add(key)
    calls.push([name, args])
  }
  return calls
}

/** Synchronous on purpose: the scriptlets must be in place before the page's first script. */
function loadShardSync(index: number): ScriptletShard {
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', chrome.runtime.getURL(`adblock/scriptlets/data/${index}.json`), false)
    xhr.send()
    return xhr.status === 200 || xhr.status === 0 ? (JSON.parse(xhr.responseText) as ScriptletShard) : {}
  } catch {
    return {}
  }
}

function deliver(calls: ScriptletCall[]): void {
  const payload = JSON.stringify(calls)
  document.documentElement?.setAttribute(SCRIPTLET_ATTR, payload)
  document.dispatchEvent(new CustomEvent(SCRIPTLET_EVENT, { detail: payload }))
}

function run(): void {
  const bloom = globalThis.tbxScriptletBloom
  const rulesets = globalThis.tbxScriptletRulesets
  if (!bloom || !rulesets?.length || !location.hostname) return
  const calls = selectScriptlets(location.hostname, bloom, rulesets, loadShardSync)
  if (calls.length) deliver(calls)
}

if (typeof chrome !== 'undefined' && chrome.runtime?.id) run()
