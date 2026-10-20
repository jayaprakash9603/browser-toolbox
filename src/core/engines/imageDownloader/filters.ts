import { normalizeImageUrl } from './normalize'
import type { ImageFileExt, ImageFilterState, PageImage } from './types'

const DEFAULT_MAX_DIM = 99_999

export const DEFAULT_IMAGE_FILTER: ImageFilterState = {
  minWidth: 0,
  minHeight: 0,
  maxWidth: DEFAULT_MAX_DIM,
  maxHeight: DEFAULT_MAX_DIM,
  types: [],
  sources: [],
  urlQuery: '',
  hideDuplicates: true,
}

function extOf(image: PageImage): ImageFileExt {
  const raw = (image.ext ?? '').toLowerCase()
  if (raw === 'jpeg') return 'jpeg'
  if (
    raw === 'jpg' ||
    raw === 'png' ||
    raw === 'webp' ||
    raw === 'gif' ||
    raw === 'svg' ||
    raw === 'avif' ||
    raw === 'bmp' ||
    raw === 'ico'
  ) {
    return raw
  }
  return 'unknown'
}

export function dedupePageImages(images: PageImage[]): PageImage[] {
  const byKey = new Map<string, PageImage>()
  for (const image of images) {
    const key = normalizeImageUrl(image.url)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, image)
      continue
    }
    const area = image.width * image.height
    const existingArea = existing.width * existing.height
    if (area > existingArea) byKey.set(key, image)
  }
  return [...byKey.values()]
}

export function filterPageImages(images: PageImage[], filters: ImageFilterState): PageImage[] {
  let list = [...images]
  if (filters.hideDuplicates) list = dedupePageImages(list)

  const query = filters.urlQuery.trim().toLowerCase()
  const typeSet = new Set(filters.types)
  const sourceSet = new Set(filters.sources)

  return list.filter((image) => {
    if (image.width < filters.minWidth || image.height < filters.minHeight) return false
    if (image.width > filters.maxWidth || image.height > filters.maxHeight) return false
    if (typeSet.size > 0 && !typeSet.has(extOf(image))) return false
    if (sourceSet.size > 0 && !sourceSet.has(image.source)) return false
    if (query && !image.url.toLowerCase().includes(query)) return false
    return true
  })
}

export function countActiveFilters(filters: ImageFilterState): number {
  let count = 0
  if (filters.minWidth > 0 || filters.minHeight > 0) count += 1
  if (filters.maxWidth < DEFAULT_MAX_DIM || filters.maxHeight < DEFAULT_MAX_DIM) count += 1
  if (filters.types.length > 0) count += 1
  if (filters.sources.length > 0) count += 1
  if (filters.urlQuery.trim()) count += 1
  if (!filters.hideDuplicates) count += 1
  return count
}
