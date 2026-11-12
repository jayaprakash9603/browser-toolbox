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

const shardCache = new Map<number, ScriptletShard>()
const shardLoads = new Map<number, Promise<ScriptletShard>>()

function loadShardAsync(index: number): Promise<ScriptletShard> {
  const cached = shardCache.get(index)
  if (cached) return Promise.resolve(cached)
  const pending = shardLoads.get(index)
  if (pending) return pending
  const promise = fetch(chrome.runtime.getURL(`adblock/scriptlets/data/${index}.json`))
    .then((res) => (res.ok ? (res.json() as Promise<ScriptletShard>) : ({} as ScriptletShard)))
    .then((shard) => {
      shardCache.set(index, shard)
      shardLoads.delete(index)
      return shard
    })
    .catch(() => ({}) as ScriptletShard)
  shardLoads.set(index, promise)
  return promise
}

function loadShardSync(index: number): ScriptletShard {
  const cached = shardCache.get(index)
  if (cached) return cached
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', chrome.runtime.getURL(`adblock/scriptlets/data/${index}.json`), false)
    xhr.send()
    const shard =
      xhr.status === 200 || xhr.status === 0 ? (JSON.parse(xhr.responseText) as ScriptletShard) : {}
    shardCache.set(index, shard)
    return shard
  } catch {
    return {}
  }
}

function deliver(calls: ScriptletCall[]): void {
  const payload = JSON.stringify(calls)
  document.documentElement?.setAttribute(SCRIPTLET_ATTR, payload)
  document.dispatchEvent(new CustomEvent(SCRIPTLET_EVENT, { detail: payload }))
}

async function collectCalls(host: string, bloom: Base64Bloom, rulesets: number[]): Promise<ScriptletCall[]> {
  const candidates = hostCandidates(host.replace(/\.$/, ''))
  const hits = candidates.filter((candidate) => bloomHasBase64(bloom, candidate))
  if (!hits.length) return []
  const indexes = [...new Set(hits.map((candidate) => hostShard(candidate)))]
  await Promise.all(indexes.map((index) => loadShardAsync(index)))
  return selectScriptlets(host, bloom, rulesets, loadShardSync)
}

function run(): void {
  const bloom = globalThis.tbxScriptletBloom
  const rulesets = globalThis.tbxScriptletRulesets
  if (!bloom || !rulesets?.length || !location.hostname) return
  void collectCalls(location.hostname, bloom, rulesets).then((calls) => {
    if (calls.length) deliver(calls)
  })
}

if (typeof chrome !== 'undefined' && chrome.runtime?.id) run()
