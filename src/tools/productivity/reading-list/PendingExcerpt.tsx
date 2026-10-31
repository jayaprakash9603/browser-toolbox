import { useState } from 'react'
import { BookmarkPlusIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'

import { readingDomain } from './model'

const MAX_EXCERPT_LENGTH = 2000

interface PendingExcerptProps {
  excerpt: string
  sourceUrl?: string
  sourceTitle?: string
  onSave: (excerpt: string) => void
  onDismiss: () => void
}

export function PendingExcerpt({ excerpt, sourceUrl, sourceTitle, onSave, onDismiss }: PendingExcerptProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(() => excerpt.slice(0, MAX_EXCERPT_LENGTH))
  const source = sourceTitle || (sourceUrl ? readingDomain(sourceUrl) : '')

  return (
    <section
      aria-label={t('readingList.excerpt.title', { defaultValue: 'Save selected text' })}
      className="grid gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">
            {t('readingList.excerpt.title', { defaultValue: 'Save selected text' })}
          </p>
          {source && <p className="truncate text-[11px] text-muted-foreground">{source}</p>}
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('readingList.excerpt.dismiss', { defaultValue: 'Dismiss' })}
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </div>
      <Textarea
        rows={3}
        value={text}
        maxLength={MAX_EXCERPT_LENGTH}
        onChange={(event) => setText(event.target.value)}
        aria-label={t('readingList.excerpt.label', { defaultValue: 'Selected text' })}
        className="text-xs"
      />
      <Button size="sm" className="w-fit" disabled={!text.trim()} onClick={() => onSave(text)}>
        <BookmarkPlusIcon />
        {t('readingList.excerpt.save', { defaultValue: 'Save to Reading List' })}
      </Button>
    </section>
  )
}
