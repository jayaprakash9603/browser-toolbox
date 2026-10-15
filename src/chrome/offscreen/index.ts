import { base64ToBytes } from '@/core/engines/htmlArchive'
import { isExtensionMessage } from '@/core/messaging/types'

const pendingParts = new Map<string, BlobPart[]>()
const blobUrls = new Map<string, string>()

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false
  switch (raw.type) {
    case 'OFFSCREEN_BUNDLE_CHUNK': {
      const parts = pendingParts.get(raw.buildId) ?? []
      parts.push(base64ToBytes(raw.base64) as BlobPart)
      pendingParts.set(raw.buildId, parts)
      sendResponse({ ok: true, data: { parts: parts.length } })
      return false
    }
    case 'OFFSCREEN_BUNDLE_FINALIZE': {
      const blob = new Blob(pendingParts.get(raw.buildId) ?? [], { type: 'application/zip' })
      pendingParts.delete(raw.buildId)
      const url = URL.createObjectURL(blob)
      blobUrls.set(raw.buildId, url)
      sendResponse({ ok: true, data: { url } })
      return false
    }
    case 'OFFSCREEN_BUNDLE_RELEASE': {
      const url = blobUrls.get(raw.buildId)
      if (url) URL.revokeObjectURL(url)
      blobUrls.delete(raw.buildId)
      pendingParts.delete(raw.buildId)
      sendResponse({ ok: true, data: { released: true } })
      return false
    }
    default:
      return false
  }
})
