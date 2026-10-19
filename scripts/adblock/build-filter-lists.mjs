import { mkdir, readFile, writeFile } from 'node:fs/promises'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCosmeticCollector } from './converter/cosmetic.mjs'
import {
  capRules,
  MAX_STATIC_RULES_PER_RULESET,
  RULESET_RULE_BUDGET,
} from './converter/limits.mjs'
import { parseFilterLine } from './converter/parseFilter.mjs'
import { buildYoutubeHandRules, networkFilterToDnrRule } from './converter/toDnrRule.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'public/adblock')
const rulesetDir = join(outDir, 'rulesets')
const cosmeticDir = join(outDir, 'cosmetic')

const RULESET_ID_START = { ads: 1000, privacy: 10_000, annoyances: 18_000 }

const BASE_GENERIC_SELECTORS = [
  'ins.adsbygoogle',
  'iframe[id^="google_ads_iframe"]',
  'div[id^="div-gpt-ad"]',
  'div[id^="google_ads_iframe"]',
  'ins[data-anchor-status]',
  'ins[data-vignette-loaded]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="doubleclick.net"]',
  'a[href*="doubleclick.net/"]',
  '[data-ad-slot]',
  '[data-google-query-id]',
  '.adsbygoogle',
  '#ad',
  '#ads',
  '.advert',
  '.advertisement',
  '.banner-ad',
  '.sponsored-content',
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

async function main() {
  const sources = await readJson(join(__dirname, 'sources.json'), { lists: [] })
  await mkdir(rulesetDir, { recursive: true })
  await mkdir(cosmeticDir, { recursive: true })

  const buckets = { ads: [], privacy: [], annoyances: [] }
  const cosmetic = createCosmeticCollector()
  const report = { lists: [], totals: { network: 0, cosmetic: 0, skipped: 0 }, rulesets: {} }

  for (const list of sources.lists) {
    let text
    try {
      if (offline) throw new Error('offline mode')
      text = await fetchText(list.url)
    } catch (error) {
      console.warn(`[adblock] skip ${list.id}:`, error instanceof Error ? error.message : error)
      continue
    }
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

  for (const [name, rules] of Object.entries(buckets)) {
    const start = RULESET_ID_START[name]
    const seen = new Set()
    const deduped = []
    // Exceptions first so they survive the cap alongside the blocks they override.
    for (const rule of [...rules].sort((a, b) => b.priority - a.priority)) {
      const key = `${rule.action.type}:${JSON.stringify(rule.condition)}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push({ ...rule, id: start + deduped.length })
    }
    const { rules: capped, dropped } = capRules(
      deduped,
      RULESET_RULE_BUDGET[name] ?? MAX_STATIC_RULES_PER_RULESET,
    )
    const path = join(rulesetDir, `${name}.json`)
    const toWrite = capped.length ? capped : await readJson(path, [])
    await writeFile(path, `${JSON.stringify(toWrite)}\n`)
    report.rulesets[name] = toWrite.length
    console.log(`[adblock] ruleset ${name}: ${toWrite.length} rules (dropped ${dropped})`)
  }

  const youtubeRules = buildYoutubeHandRules()
  await writeFile(join(rulesetDir, 'youtube.json'), `${JSON.stringify(youtubeRules, null, 2)}\n`)
  report.rulesets.youtube = youtubeRules.length

  const built = cosmetic.build()
  const baseCss = BASE_GENERIC_SELECTORS.map((s) => `${s}{display:none!important}`).join('\n')
  await writeFile(join(cosmeticDir, 'generic.css'), `${[baseCss, built.genericCss].filter(Boolean).join('\n')}\n`)
  await writeFile(
    join(cosmeticDir, 'specific.json'),
    `${JSON.stringify({ specific: built.specific, exceptions: built.specificExceptions })}\n`,
  )

  await writeFile(
    join(outDir, 'meta.json'),
    `${JSON.stringify({ ...report, cosmetic: built.counts, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  )
  console.log('[adblock] done', report.totals)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
