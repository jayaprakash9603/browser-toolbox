import { collectPageLinks } from '@/chrome/content/collectors/links'
import { scanImagesOnPage } from '@/chrome/content/scanImages'
import { collectMediaElements, mergeResources, buildScanResult } from '@/core/engines/download-manager/scan'
import type { DownloadableScanResult } from '@/core/download-manager'

export function scanDownloadableResources(options: {
  includeImages?: boolean
  includeMedia?: boolean
}): DownloadableScanResult {
  const links = collectPageLinks()
  const linkPayload = links.links.map((l) => ({ href: l.href, download: l.download }))
  const images = options.includeImages === false ? [] : scanImagesOnPage()
  const resources = mergeResources(linkPayload, images)
  if (options.includeMedia !== false) {
    const media = collectMediaElements()
    const map = new Map(resources.map((r) => [r.url, r]))
    for (const m of media) map.set(m.url, m)
    return buildScanResult(links.url, links.title, [...map.values()], links.truncated)
  }
  return buildScanResult(links.url, links.title, resources, links.truncated)
}
