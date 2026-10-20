import { scanPageImages } from '@/core/engines/imageDownloader'

export function scanImagesOnPage(): ReturnType<typeof scanPageImages> {
  return scanPageImages(document, window.location.href)
}
