// Audit the generated rulesets: ad-host coverage, DNR syntax constraints and rule budgets.
// Exits non-zero on any problem so `npm run adblock:audit` can gate regeneration.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const MUST_BLOCK = [
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com',
  'doubleclick.net',
  'googleads.g.doubleclick.net',
  'securepubads.g.doubleclick.net',
  'googleadservices.com',
  'adservice.google.com',
  'ep1.adtrafficquality.google',
  'amazon-adsystem.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'adnxs.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'popads.net',
  'propellerads.com',
  'adsterra.com',
  'exoclick.com',
  'mgid.com',
  'revcontent.com',
  'media.net',
  'smartadserver.com',
  'casalemedia.com',
  'adform.net',
  'highperformanceformat.com',
  'effectivegatecpm.com',
  'a-ads.com',
]

const VALID_TYPES = new Set([
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other',
])
const STATIC_BUDGET = 30_000
const DEFAULT_ENABLED = ['ads', 'privacy', 'youtube']

const rulesets = {}
for (const name of ['ads', 'privacy', 'annoyances', 'youtube']) {
  rulesets[name] = JSON.parse(readFileSync(join(root, `public/adblock/rulesets/${name}.json`), 'utf8'))
}

const problems = []

// 1. Syntax constraints Chrome enforces (invalid rules are silently ignored, so catch them here).
for (const [name, rules] of Object.entries(rulesets)) {
  const ids = new Set()
  for (const rule of rules) {
    const where = `${name}#${rule.id}`
    if (ids.has(rule.id)) problems.push(`${where}: duplicate id`)
    ids.add(rule.id)
    const { urlFilter, requestDomains, resourceTypes } = rule.condition
    if (!urlFilter && !requestDomains?.length) problems.push(`${where}: no url or domain condition`)
    for (const type of resourceTypes ?? []) {
      if (!VALID_TYPES.has(type)) problems.push(`${where}: bad resource type ${type}`)
    }
    for (const domain of requestDomains ?? []) {
      if (!/^[a-z0-9.-]+$/.test(domain) || domain.startsWith('.')) problems.push(`${where}: bad domain ${domain}`)
    }
    if (urlFilter !== undefined) {
      const body = urlFilter.replace(/^\|\|?/, '').replace(/\|$/, '')
      if (/[^\x21-\x7e]/.test(urlFilter)) problems.push(`${where}: non-ASCII urlFilter`)
      if (body.includes('|') || body.startsWith('*')) problems.push(`${where}: bad anchors in ${urlFilter}`)
      if (!urlFilter.startsWith('||') && urlFilter.includes('||')) problems.push(`${where}: || not at start`)
    }
  }
}

// 2. Rule budget for the default configuration and for everything enabled.
const count = (names) => names.reduce((sum, name) => sum + rulesets[name].length, 0)
const defaultCount = count(DEFAULT_ENABLED)
const allCount = count(Object.keys(rulesets))
console.log(`default-enabled rules: ${defaultCount}, all rulesets: ${allCount} (budget ${STATIC_BUDGET})`)
if (allCount > STATIC_BUDGET) problems.push(`all rulesets exceed ${STATIC_BUDGET} static rules`)

// 3. Coverage: every must-block host (or one of its parents) needs a block rule.
const blockDomains = new Set()
for (const name of ['ads', 'privacy', 'annoyances']) {
  for (const rule of rulesets[name]) {
    if (rule.action.type !== 'block' || rule.condition.initiatorDomains) continue
    for (const domain of rule.condition.requestDomains ?? []) blockDomains.add(domain)
  }
}
for (const host of MUST_BLOCK) {
  const parts = host.split('.')
  let covered = false
  for (let i = 0; i < parts.length - 1 && !covered; i++) covered = blockDomains.has(parts.slice(i).join('.'))
  if (!covered) problems.push(`no unrestricted block rule for ${host}`)
}
console.log(`ad-host coverage: ${MUST_BLOCK.length - problems.filter((p) => p.startsWith('no unrestricted')).length}/${MUST_BLOCK.length}`)

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`)
  for (const problem of problems.slice(0, 40)) console.error(' -', problem)
  process.exit(1)
}
console.log('audit passed')
