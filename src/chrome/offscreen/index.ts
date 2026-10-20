import { base64ToBytes } from '@/core/engines/htmlArchive'
import type { ImageSaveFormat } from '@/core/imageConvert'
import { isExtensionMessage } from '@/core/messaging/types'

import { convertImageInOffscreen } from './imageConvert'

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
    case 'OFFSCREEN_IMAGE_CONVERT': {
      void convertImageInOffscreen(raw.base64, raw.sourceMime, raw.format as ImageSaveFormat, raw.quality)
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      return true
    }
    default:
      return false
  }
})
