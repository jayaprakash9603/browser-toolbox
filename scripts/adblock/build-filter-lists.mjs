import { mkdir, readFile, rm, writeFile as fsWriteFile } from 'node:fs/promises'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCoreRules } from './core-hosts.mjs'
import { buildBloom } from './converter/bloom.mjs'
import { createCosmeticCollector } from './converter/cosmetic.mjs'
import { capRules, MAX_STATIC_RULES_PER_RULESET, RULESET_RULE_BUDGET } from './converter/limits.mjs'
import { badfilterTarget, parseFilterLine } from './converter/parseFilter.mjs'
import { preprocessList } from './converter/preprocess.mjs'
import { resolveRedirect } from './converter/redirects.mjs'
import { createScriptletCollector, parseScriptletFilter, SCRIPTLET_RULESETS } from './converter/scriptlets.mjs'
import { GENERIC_SHARD_COUNT, genericKeyShard, hostShard, SHARD_COUNT } from './converter/shard.mjs'
import {
  buildYoutubeHandRules,
  mergeDomainRules,
  networkFilterToDnrRule,
} from './converter/toDnrRule.mjs'
import { validateRuleset } from './converter/validate.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'public/adblock')
const rulesetDir = join(outDir, 'rulesets')
const cosmeticDir = join(outDir, 'cosmetic')
const shardDir = join(cosmeticDir, 'specific')
const genericDir = join(cosmeticDir, 'generic')
const scriptletDir = join(outDir, 'scriptlets')
const cacheDir = join(__dirname, '.cache')

/** uBO only runs `trusted-*` scriptlets from its own lists. */
const isTrustedList = (list) => list.id.startsWith('ublock-')
/** A false positive only costs one small shard read, so the inline filter can stay compact. */
const SCRIPTLET_BLOOM_FP = 0.02

/** Every non-empty subset, in list order: `ads`, `ads-privacy`, ... */
function rulesetCombos(names) {
  const out = []
  for (let mask = 1; mask < 1 << names.length; mask++) out.push(names.filter((_, i) => mask & (1 << i)))
  return out
}

const RULESET_ID_START = { ads: 1000, privacy: 20_000, annoyances: 40_000 }

/** Always-hidden selectors, independent of the downloaded lists. */
const BASE_GENERIC_SELECTORS = [
  // Google AdSense / Ad Manager, including anchor, vignette and auto-placed ads
  'ins.adsbygoogle',
  '.adsbygoogle',
  'ins[data-ad-client]',
  'ins[data-ad-slot]',
  'ins[data-ad-status]',
  'ins[data-anchor-status]',
  'ins[data-anchor-shown]',
  'ins[data-vignette-loaded]',
  '.google-auto-placed',
  'iframe[id^="google_ads_iframe"]',
  'iframe[id^="aswift_"]',
  'div[id^="aswift_"]',
  'div[id^="google_ads_iframe"]',
  'div[id^="google_ads_"]',
  'div[id^="div-gpt-ad"]',
  'div[id^="gpt_unit"]',
  '#ad_position_box',
  '#google_image_div',
  '[data-google-query-id]',
  '[data-ad-slot]',
  '[data-ad-unit]',
  '[data-adunit]',
  '[data-ad-format]',
  '[data-ad-client]',
  // Ad network frames and links
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googleads."]',
  'iframe[src*="adservice.google"]',
  'iframe[src*="adtrafficquality.google"]',
  'iframe[src*="amazon-adsystem.com"]',
  'iframe[src*="taboola.com"]',
  'iframe[src*="outbrain.com"]',
  'iframe[src*="adnxs.com"]',
  'iframe[src*="pubmatic.com"]',
  'iframe[src*="rubiconproject.com"]',
  'iframe[src*="criteo."]',
  'iframe[src*="mgid.com"]',
  'iframe[src*="revcontent.com"]',
  'a[href*="doubleclick.net/"]',
  'a[href*="googleadservices.com/"]',
  'a[href*="googlesyndication.com/"]',
  // Common class and id conventions
  '#ad',
  '#ads',
  '#adbox',
  '.ad-container',
  '.ad-wrapper',
  '.ad-slot',
  '.ad-box',
  '.ad-banner',
  '.ad-unit',
  '.ad-placeholder',
  '.adslot',
  '.advert',
  '.advertisement',
  '.advertising',
  '.banner-ad',
  '.banner_ad',
  '.sponsored-content',
  'div[aria-label="Advertisement"]',
  'div[aria-label="advertisement"]',
]

const offline = process.argv.includes('--offline')

/** Windows scanners and file watchers briefly lock freshly written files (UNKNOWN/EBUSY/EPERM). */
async function writeFile(path, data) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fsWriteFile(path, data)
    } catch (error) {
      if (attempt >= 8 || !['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error?.code)) throw error
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
    }
  }
}

function fetchText(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': 'browser-toolbox-adblock' } }, (res) => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume()
        resolve(fetchText(new URL(res.headers.location, url).toString(), redirects - 1))
        return
      }
      if (status !== 200) {
        res.resume()
        reject(new Error(`HTTP ${status} for ${url}`))
        return
      }
      res.setEncoding('utf8')
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve(body))
      res.on('error', reject)
    })
    req.setTimeout(60_000, () => req.destroy(new Error(`timeout for ${url}`)))
    req.on('error', reject)
  })
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

/** Download a list (and cache it), or fall back to the cached copy when offline or on error. */
async function loadText(id, url) {
  const cachePath = join(cacheDir, `${id}.txt`)
  if (!offline) {
    try {
      const text = await fetchText(url)
      await writeFile(cachePath, text)
      return text
    } catch (error) {
      console.warn(`[adblock] download failed for ${id}:`, error instanceof Error ? error.message : error)
    }
  }
  try {
    const text = await readFile(cachePath, 'utf8')
    console.log(`[adblock] using cached ${id}`)
    return text
  } catch {
    console.warn(`[adblock] no cached copy of ${id}`)
    return null
  }
}

/** A list with its `!#include`d sibling files inlined and `!#if` blocks resolved for Chromium MV3. */
async function loadList(list) {
  const text = await loadText(list.id, list.url)
  if (text == null) return null
  const includes = []
  const lines = await preprocessList(text, (name) => {
    includes.push(name)
    return loadText(`${list.id}--${name.replace(/\.txt$/, '')}`, new URL(name, list.url).toString())
  })
  return { lines, includes }
}

function assignIds(rules, start) {
  return rules.map((rule, index) => ({ ...rule, id: start + index }))
}

function buildRuleset(name, rules, coreRules) {
  const byType = (...types) => rules.filter((rule) => types.includes(rule.action.type))
  const { merged: mergedAllows, rest: restAllows } = mergeDomainRules(byType('allow', 'allowAllRequests'))
  const { merged: mergedBlocks, rest: restBlocks } = mergeDomainRules(byType('block'))
  const { merged: mergedRedirects, rest: restRedirects } = mergeDomainRules(byType('redirect'))
  const headers = byType('modifyHeaders')

  const seen = new Set()
  const unique = (list) =>
    list.filter((rule) => {
      const key = `${JSON.stringify(rule.action)}:${rule.priority}:${JSON.stringify(rule.condition)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // Order matters because of the cap: exceptions, curated hosts, merged hosts, path rules, then modifiers.
  const ordered = unique([
    ...mergedAllows,
    ...restAllows,
    ...coreRules,
    ...mergedBlocks,
    ...restBlocks,
    ...mergedRedirects,
    ...restRedirects,
    ...headers,
  ])
  const { rules: valid, rejected } = validateRuleset(assignIds(ordered, 1))
  const { rules: capped, dropped } = capRules(valid, RULESET_RULE_BUDGET[name] ?? MAX_STATIC_RULES_PER_RULESET)
  return { rules: assignIds(capped, RULESET_ID_START[name]), dropped, rejected, input: rules.length }
}

async function main() {
  const sources = await readJson(join(__dirname, 'sources.json'), { lists: [] })
  await mkdir(rulesetDir, { recursive: true })
  await mkdir(shardDir, { recursive: true })
  await mkdir(cacheDir, { recursive: true })

  const buckets = { ads: [], privacy: [], annoyances: [] }
  const cosmetic = createCosmeticCollector()
  const scriptlets = createScriptletCollector()
  const report = { lists: [], totals: { network: 0, cosmetic: 0, skipped: 0 }, rulesets: {}, scriptlets: {} }
  const scriptletRejects = {}

  const texts = []
  for (const list of sources.lists) {
    const loaded = await loadList(list)
    if (loaded) texts.push({ list, ...loaded })
  }

  // $badfilter cancels the filter it names, in any list (uBO semantics).
  const badfilters = new Set()
  for (const { lines } of texts) {
    for (const line of lines) {
      const target = badfilterTarget(line)
      if (target) badfilters.add(target)
    }
  }
  report.totals.badfiltered = 0

  for (const { list, lines, includes } of texts) {
    for (const line of lines) {
      if (badfilters.has(line.trim())) {
        report.totals.badfiltered++
        continue
      }
      const scriptlet = parseScriptletFilter(line, { trusted: isTrustedList(list) })
      if (scriptlet) {
        if (scriptlet.invalid) {
          scriptletRejects[scriptlet.invalid] = (scriptletRejects[scriptlet.invalid] ?? 0) + 1
          report.totals.skipped++
        } else scriptlets.add(scriptlet, list.ruleset)
        continue
      }
      const parsed = parseFilterLine(line)
      if (parsed.kind === 'cosmetic' || parsed.kind === 'cosmetic-exception') {
        cosmetic.add(parsed)
        report.totals.cosmetic++
        continue
      }
      if (parsed.kind === 'cosmetic-control') {
        cosmetic.addControl(parsed)
        report.totals.cosmetic++
        continue
      }
      const rule = parsed.kind === 'network' ? networkFilterToDnrRule(parsed, 1, resolveRedirect) : null
      if (!rule || !buckets[list.ruleset]) {
        report.totals.skipped++
        continue
      }
      buckets[list.ruleset].push(rule)
      report.totals.network++
    }
    report.lists.push({ id: list.id, ruleset: list.ruleset, lines: lines.length, includes })
  }

  // Never overwrite shipped data with an empty result (no network and no cache).
  if (!report.lists.length || report.totals.network === 0) {
    console.error('[adblock] no filter lists could be loaded; leaving existing data untouched')
    process.exit(1)
  }

  for (const name of Object.keys(buckets)) {
    const core = name === 'ads' ? buildCoreRules() : []
    const { rules, dropped, rejected, input } = buildRuleset(name, buckets[name], core)
    await writeFile(join(rulesetDir, `${name}.json`), `${JSON.stringify(rules)}\n`)
    report.rulesets[name] = rules.length
    report.rejected = { ...report.rejected, [name]: rejected }
    console.log(
      `[adblock] ruleset ${name}: ${rules.length} rules from ${input} filters (dropped ${dropped}, invalid ${JSON.stringify(rejected)})`,
    )
  }

  const youtubeRules = buildYoutubeHandRules()
  const youtubePath = join(rulesetDir, 'youtube.json')
  if (JSON.stringify(await readJson(youtubePath, null)) !== JSON.stringify(youtubeRules)) {
    await writeFile(youtubePath, `${JSON.stringify(youtubeRules, null, 2)}\n`)
  }
  report.rulesets.youtube = youtubeRules.length

  const built = cosmetic.build(BASE_GENERIC_SELECTORS)
  await writeFile(join(cosmeticDir, 'generic.css'), `${built.highlyGenericCss}\n`)

  await rm(genericDir, { recursive: true, force: true })
  await mkdir(genericDir, { recursive: true })
  const genericShards = Array.from({ length: GENERIC_SHARD_COUNT }, () => ({}))
  for (const [key, selectors] of Object.entries(built.keyed)) {
    genericShards[genericKeyShard(key)][key] = selectors
  }
  await Promise.all(
    genericShards.map((shard, index) =>
      writeFile(join(genericDir, `${index}.json`), `${JSON.stringify(shard)}\n`),
    ),
  )
  await writeFile(join(genericDir, 'keys.bloom'), buildBloom(Object.keys(built.keyed)))

  await rm(join(cosmeticDir, 'specific.json'), { force: true })
  await rm(shardDir, { recursive: true, force: true })
  await mkdir(shardDir, { recursive: true })
  const shards = Array.from({ length: SHARD_COUNT }, () => ({ specific: {}, exceptions: {} }))
  for (const [host, selectors] of Object.entries(built.specific)) {
    shards[hostShard(host)].specific[host] = selectors
  }
  for (const [host, selectors] of Object.entries(built.specificExceptions)) {
    shards[hostShard(host)].exceptions[host] = selectors
  }
  const controlHosts = { generichide: [], elemhide: [], specifichide: [] }
  for (const [host, list] of Object.entries(built.controls)) {
    const shard = shards[hostShard(host)]
    ;(shard.controls ??= {})[host] = list
    for (const control of list) controlHosts[control]?.push(host)
  }
  // The background reads this to keep the always-on generic CSS off $generichide/$elemhide sites.
  await writeFile(join(cosmeticDir, 'controls.json'), `${JSON.stringify(controlHosts)}\n`)
  await Promise.all(
    shards.map((shard, index) => writeFile(join(shardDir, `${index}.json`), `${JSON.stringify(shard)}\n`)),
  )

  // Scriptlets: an inline bloom of every listed host (read by the isolated-world bootstrap on each
  // page), host-sharded entries fetched only on a bloom hit, and one tiny file per ruleset combo.
  const scriptletBuild = scriptlets.build()
  await rm(scriptletDir, { recursive: true, force: true })
  await mkdir(join(scriptletDir, 'data'), { recursive: true })
  await mkdir(join(scriptletDir, 'cfg'), { recursive: true })
  const scriptletShards = Array.from({ length: SHARD_COUNT }, () => ({}))
  for (const [host, entries] of scriptletBuild.byHost) scriptletShards[hostShard(host)][host] = entries
  let scriptletBytes = 0
  await Promise.all(
    scriptletShards.map((shard, index) => {
      const json = `${JSON.stringify(shard)}\n`
      scriptletBytes += json.length
      return writeFile(join(scriptletDir, 'data', `${index}.json`), json)
    }),
  )
  const bloom = buildBloom([...scriptletBuild.byHost.keys()], SCRIPTLET_BLOOM_FP)
  const view = new DataView(bloom.buffer)
  const bloomData = { m: view.getUint32(0, true), k: view.getUint32(4, true), bits: Buffer.from(bloom.subarray(8)).toString('base64') }
  await writeFile(join(scriptletDir, 'bloom.js'), `self.tbxScriptletBloom=${JSON.stringify(bloomData)};\n`)
  for (const combo of rulesetCombos(SCRIPTLET_RULESETS)) {
    const indexes = combo.map((name) => SCRIPTLET_RULESETS.indexOf(name))
    await writeFile(join(scriptletDir, 'cfg', `${combo.join('-')}.js`), `self.tbxScriptletRulesets=${JSON.stringify(indexes)};\n`)
  }
  report.scriptlets = {
    ...scriptletBuild.counts,
    hosts: scriptletBuild.byHost.size,
    shardBytes: scriptletBytes,
    bloomBytes: bloomData.bits.length,
    disabledHosts: scriptletBuild.disabledHosts.length,
    rejected: scriptletRejects,
  }
  console.log('[adblock] scriptlets', report.scriptlets)

  const allowIds = {}
  for (const name of ['ads', 'privacy', 'annoyances', 'youtube']) {
    const rules = await readJson(join(rulesetDir, `${name}.json`), [])
    // Rules that do not stop a request: they must not count as "blocked" in the stats.
    allowIds[`ruleset-${name}`] = rules
      .filter((rule) => {
        const type = rule.action?.type
        if (type === 'block') return false
        return type !== 'redirect' || rule.action.redirect?.extensionPath == null
      })
      .map((rule) => rule.id)
  }
  await writeFile(join(outDir, 'allow-ids.json'), `${JSON.stringify(allowIds)}\n`)

  await writeFile(
    join(outDir, 'meta.json'),
    `${JSON.stringify(
      {
        ...report,
        cosmetic: { ...built.counts, shards: SHARD_COUNT, genericShards: GENERIC_SHARD_COUNT },
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  )
  console.log('[adblock] done', report.totals)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
