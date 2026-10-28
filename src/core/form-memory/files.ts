import type { CapturedField, FormMemoryState, MemoryField } from './model'

/** Each remembered file lives under its own key so form memory itself stays small to read and write. */
export const FORM_FILE_PREFIX = 'tbx.formFile.'

/** Matches the limit the page applies before reading a file. */
const MAX_FILE_BYTES = 1024 * 1024
/** storage.local holds 10 MB for the whole extension. */
const MAX_TOTAL_BYTES = 4 * 1024 * 1024
/** A file is stored before the capture that points at it, so pruning leaves fresh files alone. */
const FRESH_MS = 60_000

const freshFiles = new Map<string, number>()

export interface StoredFormFile {
  name: string
  type: string
  /** base64 */
  data: string
}

function isStoredFile(value: unknown): value is StoredFormFile {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string' && typeof item.type === 'string' && typeof item.data === 'string'
}

async function contentId(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function storedFileKeys(): Promise<string[]> {
  const keys = await chrome.storage.local.getKeys().catch(() => [] as string[])
  return keys.filter((key) => key.startsWith(FORM_FILE_PREFIX))
}

/** Keeps the picked files and replaces their contents in the capture with the ids they are stored under. */
export async function storeCapturedFiles(fields: CapturedField[]): Promise<CapturedField[]> {
  if (!fields.some((field) => field.kind === 'file')) return fields
  let used = await chrome.storage.local.getBytesInUse(await storedFileKeys()).catch(() => 0)
  const stored: CapturedField[] = []
  for (const field of fields) {
    if (field.kind !== 'file') {
      stored.push(field)
      continue
    }
    const picked = field.files ?? []
    const kept: { id: string; name: string }[] = []
    for (const file of picked) {
      if (!file.data || file.size > MAX_FILE_BYTES) continue
      const id = await contentId(file.data)
      if (used + file.data.length > MAX_TOTAL_BYTES) continue
      freshFiles.set(id, Date.now())
      await chrome.storage.local.set({
        [`${FORM_FILE_PREFIX}${id}`]: { name: file.name, type: file.type, data: file.data } satisfies StoredFormFile,
      })
      used += file.data.length
      kept.push({ id, name: file.name })
    }
    // Files too large to keep must not read as the user emptying the field.
    if (picked.length > 0 && kept.length === 0) continue
    stored.push({
      ...field,
      value: kept.map((file) => file.id),
      display: kept.map((file) => file.name).join(', ') || undefined,
      files: undefined,
    })
  }
  return stored
}

export async function loadFormFiles(fields: MemoryField[]): Promise<Record<string, StoredFormFile>> {
  const ids = [
    ...new Set(fields.filter((field) => field.kind === 'file').flatMap((field) => (Array.isArray(field.value) ? field.value : []))),
  ]
  if (ids.length === 0) return {}
  const stored = await chrome.storage.local.get(ids.map((id) => `${FORM_FILE_PREFIX}${id}`))
  const files: Record<string, StoredFormFile> = {}
  for (const id of ids) {
    const file = stored[`${FORM_FILE_PREFIX}${id}`]
    if (isStoredFile(file)) files[id] = file
  }
  return files
}

function referencedFileIds(state: FormMemoryState): Set<string> {
  const ids = new Set<string>()
  const add = (kind: string, value: unknown) => {
    if (kind === 'file' && Array.isArray(value)) for (const id of value) if (typeof id === 'string') ids.add(id)
  }
  for (const page of Object.values(state.pages)) for (const field of Object.values(page.fields)) add(field.kind, field.value)
  for (const field of Object.values(state.global)) add(field.kind, field.value)
  for (const entry of Object.values(state.review)) for (const candidate of entry.values) add(entry.field.kind, candidate.value)
  return ids
}

/** Drops stored files that no saved, global or pending value points at any more. */
export async function pruneFormFiles(state: FormMemoryState, now = Date.now()): Promise<void> {
  for (const [id, at] of freshFiles) if (now - at > FRESH_MS) freshFiles.delete(id)
  const referenced = referencedFileIds(state)
  const orphans = (await storedFileKeys()).filter((key) => {
    const id = key.slice(FORM_FILE_PREFIX.length)
    return !referenced.has(id) && !freshFiles.has(id)
  })
  if (orphans.length > 0) await chrome.storage.local.remove(orphans)
}
