import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCoreRules } from './core-hosts.mjs'
import { createCosmeticCollector } from './converter/cosmetic.mjs'
import { capRules, MAX_STATIC_RULES_PER_RULESET, RULESET_RULE_BUDGET } from './converter/limits.mjs'
import { parseFilterLine } from './converter/parseFilter.mjs'
import { hostShard, SHARD_COUNT } from './converter/shard.mjs'
import {
  buildYoutubeHandRules,
  mergeDomainRules,
  networkFilterToDnrRule,
} from './converter/toDnrRule.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'public/adblock')
const rulesetDir = join(outDir, 'rulesets')
const cosmeticDir = join(outDir, 'cosmetic')
const shardDir = join(cosmeticDir, 'specific')
const cacheDir = join(__dirname, '.cache')

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
async function loadList(list) {
  const cachePath = join(cacheDir, `${list.id}.txt`)
  if (!offline) {
    try {
      const text = await fetchText(list.url)
      await writeFile(cachePath, text)
      return text
    } catch (error) {
      console.warn(`[adblock] download failed for ${list.id}:`, error instanceof Error ? error.message : error)
    }
  }
  try {
    const text = await readFile(cachePath, 'utf8')
    console.log(`[adblock] using cached ${list.id}`)
    return text
  } catch {
    console.warn(`[adblock] no cached copy of ${list.id}`)
    return null
  }
}

function assignIds(rules, start) {
  return rules.map((rule, index) => ({ ...rule, id: start + index }))
}

function buildRuleset(name, rules, coreRules) {
  const allows = rules.filter((rule) => rule.action.type === 'allow')
  const blocks = rules.filter((rule) => rule.action.type === 'block')
  const { merged: mergedAllows, rest: restAllows } = mergeDomainRules(allows)
  const { merged: mergedBlocks, rest: restBlocks } = mergeDomainRules(blocks)

  const seen = new Set()
  const unique = (list) =>
    list.filter((rule) => {
      const key = `${rule.action.type}:${rule.priority}:${JSON.stringify(rule.condition)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // Order matters because of the cap: exceptions, curated hosts, merged hosts, then path rules.
  const ordered = unique([...mergedAllows, ...restAllows, ...coreRules, ...mergedBlocks, ...restBlocks])
  const { rules: capped, dropped } = capRules(
    ordered,
    RULESET_RULE_BUDGET[name] ?? MAX_STATIC_RULES_PER_RULESET,
  )
  return { rules: assignIds(capped, RULESET_ID_START[name]), dropped, input: rules.length }
}

async function main() {
  const sources = await readJson(join(__dirname, 'sources.json'), { lists: [] })
  await mkdir(rulesetDir, { recursive: true })
  await mkdir(shardDir, { recursive: true })
  await mkdir(cacheDir, { recursive: true })

  const buckets = { ads: [], privacy: [], annoyances: [] }
  const cosmetic = createCosmeticCollector()
  const report = { lists: [], totals: { network: 0, cosmetic: 0, skipped: 0 }, rulesets: {} }

  for (const list of sources.lists) {
    const text = await loadList(list)
    if (text == null) continue
    const lines = text.split('\n')
    for (const line of lines) {
      const parsed = parseFilterLine(line)
      if (parsed.kind === 'cosmetic' || parsed.kind === 'cosmetic-exception') {
        cosmetic.add(parsed)
        report.totals.cosmetic++
        continue
      }
      const rule = parsed.kind === 'network' ? networkFilterToDnrRule(parsed, 1) : null
      if (!rule || !buckets[list.ruleset]) {
        report.totals.skipped++
        continue
      }
      buckets[list.ruleset].push(rule)
      report.totals.network++
    }
    report.lists.push({ id: list.id, ruleset: list.ruleset, lines: lines.length })
  }

  // Never overwrite shipped data with an empty result (no network and no cache).
  if (!report.lists.length || report.totals.network === 0) {
    console.error('[adblock] no filter lists could be loaded; leaving existing data untouched')
    process.exit(1)
  }

  for (const name of Object.keys(buckets)) {
    const core = name === 'ads' ? buildCoreRules() : []
    const { rules, dropped, input } = buildRuleset(name, buckets[name], core)
    await writeFile(join(rulesetDir, `${name}.json`), `${JSON.stringify(rules)}\n`)
    report.rulesets[name] = rules.length
    console.log(`[adblock] ruleset ${name}: ${rules.length} rules from ${input} filters (dropped ${dropped})`)
  }

  const youtubeRules = buildYoutubeHandRules()
  await writeFile(join(rulesetDir, 'youtube.json'), `${JSON.stringify(youtubeRules, null, 2)}\n`)
  report.rulesets.youtube = youtubeRules.length

  const built = cosmetic.build()
  const baseCss = BASE_GENERIC_SELECTORS.map((s) => `${s}{display:none!important}`).join('\n')
  await writeFile(
    join(cosmeticDir, 'generic.css'),
    `${[baseCss, built.genericCss].filter(Boolean).join('\n')}\n`,
  )

  await rm(join(cosmeticDir, 'specific.json'), { force: true })
  const shards = Array.from({ length: SHARD_COUNT }, () => ({ specific: {}, exceptions: {} }))
  for (const [host, selectors] of Object.entries(built.specific)) {
    shards[hostShard(host)].specific[host] = selectors
  }
  for (const [host, selectors] of Object.entries(built.specificExceptions)) {
    shards[hostShard(host)].exceptions[host] = selectors
  }
  await Promise.all(
    shards.map((shard, index) => writeFile(join(shardDir, `${index}.json`), `${JSON.stringify(shard)}\n`)),
  )

  const allowIds = {}
  for (const name of ['ads', 'privacy', 'annoyances', 'youtube']) {
    const rules = await readJson(join(rulesetDir, `${name}.json`), [])
    allowIds[`ruleset-${name}`] = rules
      .filter((rule) => rule.action?.type !== 'block')
      .map((rule) => rule.id)
  }
  await writeFile(join(outDir, 'allow-ids.json'), `${JSON.stringify(allowIds)}\n`)

  await writeFile(
    join(outDir, 'meta.json'),
    `${JSON.stringify(
      {
        ...report,
        cosmetic: { ...built.counts, shards: SHARD_COUNT },
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
