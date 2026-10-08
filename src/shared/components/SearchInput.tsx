import { useEffect, useRef } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
  shortcut?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
  shortcut,
}: SearchInputProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shortcut || shortcut.length !== 1) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== shortcut || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcut])

  return (
    <div className={cn('group relative', className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            event.stopPropagation()
            onChange('')
          }
        }}
        placeholder={placeholder ?? t('common.searchPlaceholder')}
        aria-label={ariaLabel ?? t('common.search')}
        className="pr-16 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('common.clear')}
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="size-6 text-muted-foreground"
          >
            <XIcon />
          </Button>
        ) : (
          shortcut && (
            <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-sans text-[11px] leading-5 font-medium text-muted-foreground">
              {shortcut}
            </kbd>
          )
        )}
      </div>
    </div>
  )
}
