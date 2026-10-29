import { useState } from 'react'
import { BookmarkIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

const FAVICON_SIZE = 32

export function faviconUrlFor(pageUrl: string): string {
  const base = chrome.runtime.getURL('/_favicon/')
  return `${base}?pageUrl=${encodeURIComponent(pageUrl)}&size=${FAVICON_SIZE}`
}

export function BookmarkFavicon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <BookmarkIcon className={cn('size-4 text-primary', className)} aria-hidden />
  }

  return (
    <img
      src={faviconUrlFor(url)}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('size-4 rounded-sm', className)}
    />
  )
}
