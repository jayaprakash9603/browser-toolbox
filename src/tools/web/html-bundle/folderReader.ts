import type { ScanHtmlBundleResult } from '@/chrome/content/htmlBundle'
import {
  basenameOf,
  buildHtmlArchive,
  DEFAULT_MAX_BYTES,
  parseHtmlDocumentTitle,
  scanAnchorList,
  type HtmlBundleOutput,
  type HtmlBundleProgress,
  type HtmlLinkCandidate,
} from '@/core/engines/htmlArchive'

export type FileIndex = Map<string, Uint8Array>

let cachedReportFolder: FileIndex | null = null

export function clearReportFolderCache(): void {
  cachedReportFolder = null
}

export function getCachedReportFolder(): FileIndex | null {
  return cachedReportFolder
}

async function readDirectory(
  handle: FileSystemDirectoryHandle,
  prefix = '',
  index: FileIndex,
): Promise<void> {
  for await (const [name, entry] of handle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (entry.kind === 'file') {
      const file = await entry.getFile()
      index.set(path.replace(/\\/g, '/'), new Uint8Array(await file.arrayBuffer()))
    } else if (entry.kind === 'directory') {
      await readDirectory(entry, path, index)
    }
  }
}

function extractAnchorsFromHtml(html: string): { href: string; label: string }[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return [...doc.querySelectorAll<HTMLAnchorElement>('a[href]')].map((anchor) => ({
    href: anchor.getAttribute('href') ?? '',
    label: (anchor.textContent ?? '').trim().slice(0, 160),
  }))
}

export function scanHtmlBundleFromFolderIndex(
  index: FileIndex,
  pageUrl: string,
  options: { htmlOnly: boolean; sameFolderOnly: boolean },
): ScanHtmlBundleResult {
  const currentPageFileName = basenameOf(pageUrl)
  const current = findFileByName(index, currentPageFileName)
  const html = current ? decode(current.bytes) : ''
  const pageTitle = parseHtmlDocumentTitle(html) || currentPageFileName
  const entries = html ? scanAnchorList(extractAnchorsFromHtml(html), pageUrl, options) : []

  return {
    pageUrl,
    pageTitle,
    entries: enrichEntriesFromFolderIndex(entries, index),
  }
}

function enrichEntriesFromFolderIndex(
  entries: HtmlLinkCandidate[],
  index: FileIndex,
): HtmlLinkCandidate[] {
  return entries.map((entry) => {
    const file = findFileByName(index, basenameOf(entry.resolvedUrl))
    if (!file) return entry
    const title = parseHtmlDocumentTitle(decode(file.bytes))
    return title ? { ...entry, label: title } : entry
  })
}

export async function pickReportFolder(options?: {
  forcePick?: boolean
}): Promise<FileIndex | null> {
  if (!options?.forcePick && cachedReportFolder) return cachedReportFolder

  const picker = (
    window as Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' }) => Promise<FileSystemDirectoryHandle>
    }
  ).showDirectoryPicker
  if (!picker) return null
  const handle = await picker({ mode: 'read' })
  const index: FileIndex = new Map()
  await readDirectory(handle, '', index)
  cachedReportFolder = index
  return index
}

function findFileByName(index: FileIndex, filename: string): { path: string; bytes: Uint8Array } | null {
  const normalized = filename.replace(/\\/g, '/').split('/').pop() ?? filename
  for (const [path, bytes] of index) {
    if (path.split('/').pop() === normalized) return { path, bytes }
  }
  return null
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

const SYNTHETIC_ROOT = 'file:///report/'

function folderLoader(index: FileIndex, prefix: string) {
  return async (url: string): Promise<Uint8Array | null> => {
    if (!url.startsWith(SYNTHETIC_ROOT)) return null
    const relative = url
      .slice(SYNTHETIC_ROOT.length)
      .split('/')
      .map((segment) => {
        try {
          return decodeURIComponent(segment)
        } catch {
          return segment
        }
      })
      .join('/')
    const exact = index.get(`${prefix}${relative}`) ?? index.get(relative)
    if (exact) return exact
    for (const [path, bytes] of index) {
      if (path.endsWith(`/${relative}`)) return bytes
    }
    return null
  }
}

export interface FolderBundleRequest {
  currentPageFileName: string
  selectedFileNames: string[]
  includeAssets: boolean
  maxBytes?: number
  onProgress?: (progress: HtmlBundleProgress) => void
}

export async function buildBundleFromFolderIndex(
  index: FileIndex,
  request: FolderBundleRequest,
): Promise<HtmlBundleOutput> {
  const current = findFileByName(index, request.currentPageFileName)
  const prefix = current ? current.path.slice(0, current.path.lastIndexOf('/') + 1) : ''
  const toUrl = (name: string) => `${SYNTHETIC_ROOT}${encodeURIComponent(name)}`

  return buildHtmlArchive(
    {
      rootPageUrl: toUrl(request.currentPageFileName),
      pageUrls: [request.currentPageFileName, ...request.selectedFileNames].map(toUrl),
      includeAssets: request.includeAssets,
      maxBytes: request.maxBytes ?? DEFAULT_MAX_BYTES,
      onProgress: request.onProgress,
    },
    { loadBytes: folderLoader(index, prefix) },
  )
}
