import { mkdir, readFile, writeFile } from 'node:fs/promises'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'public/protection')
const cacheDir = join(__dirname, '.cache')

const offline = process.argv.includes('--offline')

const FEEDS = [
  {
    id: 'phishing',
    category: 'phishing',
    url: 'https://malware-filter.gitlab.io/malware-filter/phishing-filter-domains.txt',
    license: 'CC0 / MIT (malware-filter)',
  },
  {
    id: 'malware',
    category: 'malware',
    url: 'https://malware-filter.pages.dev/urlhaus-filter-domains.txt',
    license: 'CC0 / MIT (URLhaus filter)',
  },
  {
    id: 'badware',
    category: 'scam',
    format: 'abp',
    url: 'https://ublockorigin.github.io/uAssets/filters/badware.txt',
    license: 'GPL-3.0 (uBlock Origin uAssets)',
  },
  {
    id: 'nocoin',
    category: 'miner',
    format: 'abp',
    url: 'https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt',
    license: 'MIT (NoCoin adblock list)',
  },
]

const CATEGORIES = ['phishing', 'malware', 'scam', 'miner']

/** Exact hosts never blocked (major shared infrastructure). Subdomains of these are still blocked. */
export const NEVER_BLOCK = new Set([
  'google.com',
  'googleapis.com',
  'gstatic.com',
  'googleusercontent.com',
  'github.com',
  'github.io',
  'gitlab.com',
  'microsoft.com',
  'live.com',
  'office.com',
  'office365.com',
  'apple.com',
  'icloud.com',
  'amazon.com',
  'aws.amazon.com',
  'cloudfront.net',
  'facebook.com',
  'instagram.com',
  'whatsapp.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  'wikipedia.org',
  'wordpress.com',
  'blogspot.com',
  'mozilla.org',
  'w3.org',
  'stackoverflow.com',
  'reddit.com',
  'paypal.com',
  'stripe.com',
  'cloudflare.com',
  'docs.google.com',
])

export function normalizeThreatHost(raw) {
  let h = raw.trim().toLowerCase()
  if (!h || h.startsWith('#') || h.startsWith('!')) return null
  h = h.replace(/^\|\|/, '').replace(/\^.*$/, '').replace(/^\*/, '').split('/')[0].split(':')[0]
  if (!h || h.length > 253) return null
  if (/^[\d.]+$/.test(h)) return h
  if (!/^[a-z0-9.-]+$/.test(h) || h.startsWith('.') || h.endsWith('.')) return null
  const labels = h.split('.')
  if (labels.some((label) => label.length < 2)) return null
  if (labels.length >= 2 && labels[labels.length - 2].length < 2) return null
  return h
}

export function parseDomainList(text) {
  const hosts = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue
    // hosts-file lines look like "0.0.0.0 bad.example"; keep the host part
    const token = trimmed.split(/\s+/).pop() ?? ''
    const host = normalizeThreatHost(token)
    if (host && host !== '0.0.0.0' && host !== '127.0.0.1') hosts.push(host)
  }
  return hosts
}

/** ABP-style lists (uBO badware, NoCoin): keep whole-domain `||domain^` blocks, skip path rules. */
export function parseBadwareList(text) {
  const hosts = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('!')) continue
    const m = /^\|\|([^/^|*$]+)\^(\$.*)?$/.exec(trimmed)
    if (!m) continue
    // context-limited or modifier-only filters are not whole-site blocks
    if (m[2] && /domain=|badfilter|removeparam|redirect|csp|header=/.test(m[2])) continue
    const host = normalizeThreatHost(m[1])
    if (host) hosts.push(host)
  }
  return hosts
}

function dropSubdomainsCoveredByParent(hosts) {
  const set = new Set(hosts)
  return hosts.filter((host) => {
    const parts = host.split('.')
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.')
      if (set.has(parent)) return false
    }
    return true
  })
}

function fetchText(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': 'browser-toolbox-protection' } }, (res) => {
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
    req.setTimeout(120_000, () => req.destroy(new Error(`timeout for ${url}`)))
    req.on('error', reject)
  })
}

async function loadFeed(feed) {
  const cachePath = join(cacheDir, `${feed.id}.txt`)
  if (!offline) {
    try {
      const text = await fetchText(feed.url)
      await writeFile(cachePath, text)
      return text
    } catch (error) {
      console.warn(
        `[protection] download failed for ${feed.id}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }
  try {
    const text = await readFile(cachePath, 'utf8')
    console.log(`[protection] using cached ${feed.id}`)
    return text
  } catch {
    console.warn(`[protection] no cached copy of ${feed.id}`)
    return null
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await mkdir(cacheDir, { recursive: true })

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, []]))
  const sources = []
  let loaded = 0

  for (const feed of FEEDS) {
    const text = await loadFeed(feed)
    if (text == null) continue
    loaded++
    const hosts = feed.format === 'abp' ? parseBadwareList(text) : parseDomainList(text)
    byCategory[feed.category].push(...hosts)
    sources.push({ id: feed.id, category: feed.category, lines: hosts.length, license: feed.license })
    console.log(`[protection] ${feed.id}: ${hosts.length} hosts`)
  }

  if (!loaded) {
    console.error('[protection] no feeds loaded; leaving existing data untouched')
    process.exit(1)
  }

  const assigned = new Set()
  const result = Object.fromEntries(CATEGORIES.map((c) => [c, []]))

  for (const category of CATEGORIES) {
    const unique = [...new Set(byCategory[category])]
    const filtered = unique.filter((h) => {
      if (NEVER_BLOCK.has(h)) return false
      if (assigned.has(h)) return false
      assigned.add(h)
      return true
    })
    result[category] = dropSubdomainsCoveredByParent(filtered)
  }

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, result[c].length]))
  counts.total = CATEGORIES.reduce((sum, c) => sum + result[c].length, 0)

  if (counts.total === 0) {
    console.error('[protection] zero hosts after parse; not writing')
    process.exit(1)
  }

  const payload = {
    generated: new Date().toISOString(),
    sources,
    counts,
    ...result,
  }

  await writeFile(join(outDir, 'threats.json'), `${JSON.stringify(payload)}\n`)

  const licenses = `# Threat list licenses

Bundled data is rebuilt with \`npm run protection:lists\`. No threat data is downloaded at runtime.

| Feed | License |
| --- | --- |
| Phishing URL Blocklist (malware-filter) | CC0 / MIT |
| URLhaus domain filter (malware-filter) | CC0 / MIT |
| uBlock Origin – Badware risks | GPL-3.0 |
| NoCoin adblock list (cryptominers) | MIT |

Generated: ${payload.generated}
`
  await writeFile(join(outDir, 'LICENSES.md'), licenses)
  console.log('[protection] done', counts)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
