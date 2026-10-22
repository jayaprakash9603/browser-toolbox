/**
 * Only the ad schedule. YouTube checks that `playerAds`, the `adBreak*` params and the other ad
 * fields are still present; stripping them is detected and answered with a forced buffering
 * delay ("Experiencing interruptions?") or a stopped player. Same scope as uBO's quick fixes.
 */
const YT_AD_KEYS = ['adPlacements', 'adSlots'] as const
/** Do not recurse into generic `response` — it appears on comment/browse APIs and is not player ads. */
const NESTED_KEYS = ['playerResponse', 'playerConfig'] as const
const MAX_DEPTH = 4

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object'
}

/** Empty ad arrays appear on browse/comment payloads — pruning them breaks loading and is wasted work. */
function isNonEmptyAdValue(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as JsonRecord).length > 0
  return true
}

function recordHasAdPayload(record: JsonRecord): boolean {
  if (YT_AD_KEYS.some((key) => key in record && isNonEmptyAdValue(record[key]))) return true
  const renderers = (record.auxiliaryUi as JsonRecord | undefined)?.messageRenderers
  return isRecord(renderers) && 'enforcementMessageViewModel' in renderers
}

function stripAdKeys(record: JsonRecord): number {
  let removed = 0
  for (const key of YT_AD_KEYS) {
    if (key in record && isNonEmptyAdValue(record[key])) {
      delete record[key]
      removed++
    }
  }
  const renderers = (record.auxiliaryUi as JsonRecord | undefined)?.messageRenderers
  if (isRecord(renderers) && 'enforcementMessageViewModel' in renderers) {
    delete renderers.enforcementMessageViewModel
    removed++
  }
  return removed
}

/**
 * Removes ad payloads from a YouTube player/next response, mutating it in place
 * so YouTube keeps the exact object (and Response/XHR) it created.
 * Returns how many ad entries were removed.
 */
export function pruneYoutubeAdsInPlace(data: unknown, depth = 0): number {
  if (!isRecord(data) || depth > MAX_DEPTH) return 0
  if (Array.isArray(data)) {
    return data.reduce<number>((sum, item) => sum + pruneYoutubeAdsInPlace(item, depth + 1), 0)
  }
  let removed = stripAdKeys(data)
  for (const key of NESTED_KEYS) removed += pruneYoutubeAdsInPlace(data[key], depth + 1)
  return removed
}

export function pruneYoutubePlayerJson<T extends JsonRecord>(data: T): T {
  pruneYoutubeAdsInPlace(data)
  return data
}

/** Cheap check used by the JSON.parse hook before walking an object. */
export function hasYoutubeAdPayload(data: unknown): boolean {
  if (!isRecord(data)) return false
  if (Array.isArray(data)) return data.some((item) => hasYoutubeAdPayload(item))
  if (recordHasAdPayload(data)) return true
  const pr = data.playerResponse
  return isRecord(pr) && recordHasAdPayload(pr)
}

export function pruneYoutubeResponseText(text: string): { text: string; removed: number } {
  if (
    !/"(adPlacements|adSlots|enforcementMessageViewModel)"\s*:\s*(?!\[\s*\])(?!\{\s*\})/.test(
      text,
    )
  ) {
    return { text, removed: 0 }
  }
  try {
    const parsed = JSON.parse(text) as unknown
    const removed = pruneYoutubeAdsInPlace(parsed)
    return removed ? { text: JSON.stringify(parsed), removed } : { text, removed: 0 }
  } catch {
    return { text, removed: 0 }
  }
}

export function isYoutubePlayerEndpoint(url: string): boolean {
  return /\/youtubei\/v1\/(player|next|reel\/reel_item_watch)/.test(url)
}
