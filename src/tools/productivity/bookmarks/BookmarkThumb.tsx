import { useEffect, useState } from 'react'

import { domainHashHue, loadBookmarkThumbnail, subscribeThumbnails } from '@/core/bookmarks'
import { bookmarkDomain } from './service'
import { BookmarkFavicon } from './BookmarkFavicon'

export function BookmarkThumb({
  bookmarkId,
  url,
  compact,
}: {
  bookmarkId: string
  url: string
  compact?: boolean
}) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void loadBookmarkThumbnail(bookmarkId).then((value) => {
      if (live) setSrc(value)
    })
    const stop = subscribeThumbnails((id) => {
      if (id === bookmarkId) void loadBookmarkThumbnail(bookmarkId).then(setSrc)
    })
    return () => {
      live = false
      stop()
    }
  }, [bookmarkId])
  const hue = domainHashHue(bookmarkDomain(url))
  return (
    <div
      className={compact ? 'relative h-16 overflow-hidden rounded-md' : 'relative aspect-video overflow-hidden rounded-md'}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 42% 46% / 0.35), hsl(${(hue + 40) % 360} 38% 38% / 0.2))` }}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <BookmarkFavicon url={url} className="size-7 rounded-md" />
        </span>
      )}
    </div>
  )
}
