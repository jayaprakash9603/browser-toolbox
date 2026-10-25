import type { AntifeatureType, LocalizedString, ParsedMetadata, RunAt, RunIn, SandboxMode } from './types'

const HEADER_START = '// ==UserScript=='
const HEADER_END = '// ==/UserScript=='

function parseLocalizedKey(key: string): { base: string; locale?: string } {
  const m = /^@(\w+)(?::(.+))?$/.exec(key)
  if (!m) return { base: key }
  return { base: `@${m[1]}`, locale: m[2] }
}

function pushLocalized(
  map: LocalizedString,
  key: string,
  value: string,
  defaultLocale = 'en',
): void {
  const { locale } = parseLocalizedKey(key)
  const loc = locale ?? defaultLocale
  map[loc] = value.trim()
}

function parseResourceLine(line: string): { name: string; url: string; integrity?: string } | null {
  const m = /^(\S+)\s+(\S+?)(?:\s+#(.+))?$/.exec(line.trim())
  if (!m) return null
  return { name: m[1], url: m[2], integrity: m[3] ? `#${m[3]}` : undefined }
}

function parseRequireLine(line: string): { url: string; integrity?: string } {
  const trimmed = line.trim()
  const hashIdx = trimmed.indexOf('#')
  if (hashIdx > 0 && trimmed.includes('://')) {
    const beforeHash = trimmed.slice(0, hashIdx)
    const lastSpace = beforeHash.lastIndexOf(' ')
    if (lastSpace === -1) {
      return { url: beforeHash, integrity: trimmed.slice(hashIdx) }
    }
  }
  const parts = trimmed.split(/\s+#/)
  if (parts.length === 2 && parts[0].includes('://')) {
    return { url: parts[0].trim(), integrity: `#${parts[1]}` }
  }
  return { url: trimmed }
}

function parseAntifeature(line: string): { type: AntifeatureType; text: LocalizedString } | null {
  const m = /^@antifeature(?::(\w+))?\s+(.+)$/i.exec(line.trim())
  if (!m) return null
  const type = (m[1] ?? 'other') as AntifeatureType
  const text: LocalizedString = {}
  text[m[1] ? m[1] : 'en'] = m[2].trim()
  return { type, text }
}

export function extractMetadataBlock(source: string): { block: string; body: string } | null {
  const lines = source.split(/\r?\n/)
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === HEADER_START || t.startsWith('// ==UserScript==')) start = i
    if (start >= 0 && (t === HEADER_END || t.startsWith('// ==/UserScript=='))) {
      end = i
      break
    }
  }
  if (start < 0 || end < 0) return null
  const block = lines.slice(start, end + 1).join('\n')
  const body = [...lines.slice(0, start), ...lines.slice(end + 1)].join('\n').trimStart()
  return { block, body }
}

export function parseMetadata(source: string): ParsedMetadata | null {
  const extracted = extractMetadataBlock(source)
  if (!extracted) return null

  const meta: ParsedMetadata = {
    name: {},
    namespace: '',
    version: '0.0.0',
    description: {},
    grants: [],
    requires: [],
    resources: [],
    includes: [],
    matches: [],
    excludes: [],
    connects: [],
    tags: [],
    runAt: 'document-idle',
    runIn: ['normal-tabs'],
    antifeatures: [],
    rawLines: [],
  }

  for (const line of extracted.block.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('// @')) continue
    const content = trimmed.slice(2).trim()
    meta.rawLines.push(content)
    const space = content.indexOf(' ')
    const keyPart = space === -1 ? content : content.slice(0, space)
    const value = space === -1 ? '' : content.slice(space + 1)

    const keyLower = keyPart.toLowerCase()

    if (keyLower === '@name' || keyLower.startsWith('@name:')) {
      pushLocalized(meta.name, keyPart, value)
    } else if (keyLower === '@namespace') {
      meta.namespace = value.trim()
    } else if (keyLower === '@version') {
      meta.version = value.trim() || '0.0.0'
    } else if (keyLower === '@description' || keyLower.startsWith('@description:')) {
      pushLocalized(meta.description, keyPart, value)
    } else if (keyLower === '@author') {
      meta.author = value.trim()
    } else if (keyLower === '@copyright') {
      meta.copyright = value.trim()
    } else if (keyLower === '@icon' || keyLower === '@iconurl' || keyLower === '@defaulticon') {
      meta.icon = value.trim()
    } else if (keyLower === '@icon64' || keyLower === '@icon64url') {
      meta.icon64 = value.trim()
    } else if (keyLower === '@grant') {
      meta.grants.push(value.trim())
    } else if (keyLower === '@require') {
      meta.requires.push(parseRequireLine(value))
    } else if (keyLower === '@resource') {
      const r = parseResourceLine(value)
      if (r) meta.resources.push(r)
    } else if (keyLower === '@include') {
      meta.includes.push(value.trim())
    } else if (keyLower === '@match') {
      meta.matches.push(value.trim())
    } else if (keyLower === '@exclude') {
      meta.excludes.push(value.trim())
    } else if (keyLower === '@connect' || keyLower === '@domain') {
      meta.connects.push(value.trim())
    } else if (keyLower === '@tag') {
      meta.tags.push(value.trim())
    } else if (keyLower === '@run-at') {
      meta.runAt = value.trim() as RunAt
    } else if (keyLower === '@run-in') {
      meta.runIn.push(value.trim() as RunIn)
    } else if (keyLower === '@sandbox') {
      meta.sandbox = value.trim() as SandboxMode
    } else if (keyLower === '@noframes') {
      meta.noframes = true
    } else if (keyLower === '@unwrap') {
      meta.unwrap = true
    } else if (keyLower === '@updateurl') {
      meta.updateUrl = value.trim()
    } else if (keyLower === '@downloadurl') {
      meta.downloadUrl = value.trim()
    } else if (keyLower === '@supporturl') {
      meta.supportUrl = value.trim()
    } else if (
      keyLower === '@homepage' ||
      keyLower === '@homepageurl' ||
      keyLower === '@website'
    ) {
      meta.homepage = value.trim()
    } else if (keyLower === '@source') {
      meta.source = value.trim()
    } else if (keyLower.startsWith('@antifeature')) {
      const af = parseAntifeature(content)
      if (af) meta.antifeatures.push(af)
    } else if (keyLower === '@webrequest') {
      try {
        meta.webRequestRules = JSON.parse(value)
      } catch {
        meta.webRequestRules = value
      }
    }
  }

  if (Object.keys(meta.name).length === 0) meta.name.en = 'Unnamed script'
  if (Object.keys(meta.description).length === 0) meta.description.en = ''
  if (meta.runIn.length === 0) meta.runIn = ['normal-tabs']

  return meta
}

export function pickLocalized(map: LocalizedString, locale = 'en'): string {
  return map[locale] ?? map.en ?? Object.values(map)[0] ?? ''
}

export function serializeMetadata(meta: ParsedMetadata): string {
  const lines: string[] = [HEADER_START]
  const push = (k: string, v: string) => {
    if (v) lines.push(`// ${k} ${v}`)
  }

  for (const [loc, name] of Object.entries(meta.name)) {
    push(loc === 'en' ? '@name' : `@name:${loc}`, name)
  }
  push('@namespace', meta.namespace)
  push('@version', meta.version)
  for (const [loc, desc] of Object.entries(meta.description)) {
    push(loc === 'en' ? '@description' : `@description:${loc}`, desc)
  }
  if (meta.author) push('@author', meta.author)
  if (meta.copyright) push('@copyright', meta.copyright)
  if (meta.icon) push('@icon', meta.icon)
  if (meta.icon64) push('@icon64', meta.icon64)
  for (const g of meta.grants) push('@grant', g)
  for (const r of meta.requires) {
    push('@require', r.integrity ? `${r.url} ${r.integrity}` : r.url)
  }
  for (const res of meta.resources) {
    const integ = res.integrity ? ` ${res.integrity}` : ''
    push('@resource', `${res.name} ${res.url}${integ}`)
  }
  for (const inc of meta.includes) push('@include', inc)
  for (const m of meta.matches) push('@match', m)
  for (const ex of meta.excludes) push('@exclude', ex)
  for (const c of meta.connects) push('@connect', c)
  for (const t of meta.tags) push('@tag', t)
  push('@run-at', meta.runAt)
  for (const ri of meta.runIn) push('@run-in', ri)
  if (meta.sandbox) push('@sandbox', meta.sandbox)
  if (meta.noframes) push('@noframes', '')
  if (meta.unwrap) push('@unwrap', '')
  if (meta.updateUrl) push('@updateURL', meta.updateUrl)
  if (meta.downloadUrl) push('@downloadURL', meta.downloadUrl)
  if (meta.supportUrl) push('@supportURL', meta.supportUrl)
  if (meta.homepage) push('@homepage', meta.homepage)
  if (meta.source) push('@source', meta.source)
  for (const af of meta.antifeatures) {
    for (const [loc, text] of Object.entries(af.text)) {
      push(loc === 'en' ? `@antifeature:${af.type}` : `@antifeature:${af.type}:${loc}`, text)
    }
  }
  lines.push(HEADER_END)
  return lines.join('\n')
}

export function buildScriptSource(meta: ParsedMetadata, body: string): string {
  return `${serializeMetadata(meta)}\n\n${body.trim()}\n`
}

export function getMetadataFromSource(source: string): ParsedMetadata | null {
  return parseMetadata(source)
}
