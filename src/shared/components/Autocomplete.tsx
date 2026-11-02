import { useMemo, useState } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

import { HighlightedText } from '@/shared/components/HighlightedText'
import { Input } from '@/shared/components/ui/input'
import { matchesSearchText } from '@/shared/lib/searchMatching'
import { cn } from '@/shared/utils/cn'

export interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  id: string
  options: readonly AutocompleteOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  noResultsLabel?: string
  className?: string
}

export function Autocomplete({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  noResultsLabel = 'No matches found',
  className,
}: AutocompleteProps) {
  const [query, setQuery] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeValue, setActiveValue] = useState(value)
  const selectedOption = options.find((option) => option.value === value)
  const inputValue = query ?? selectedOption?.label ?? ''
  const listId = `${id}-listbox`

  const matchingOptions = useMemo(() => {
    const trimmedQuery = query?.trim() ?? ''
    if (!trimmedQuery) return options
    return options.filter((option) => matchesSearchText(option.label, trimmedQuery))
  }, [options, query])
  const activeIndex = matchingOptions.findIndex((option) => option.value === activeValue)

  const selectOption = (option: AutocompleteOption) => {
    onValueChange(option.value)
    setActiveValue(option.value)
    setQuery(null)
    setOpen(false)
  }

  const moveActiveOption = (direction: 1 | -1) => {
    setOpen(true)
    if (matchingOptions.length === 0) {
      setActiveValue('')
      return
    }
    const nextIndex =
      activeIndex < 0
        ? direction === 1
          ? 0
          : matchingOptions.length - 1
        : (activeIndex + direction + matchingOptions.length) % matchingOptions.length
    setActiveValue(matchingOptions[nextIndex].value)
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      <Input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={inputValue}
        placeholder={placeholder}
        className="h-11 rounded-lg pr-9 transition-none"
        onFocus={() => {
          setOpen(true)
          setActiveValue(value || options[0]?.value || '')
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          const nextMatches = nextQuery.trim()
            ? options.filter((option) => matchesSearchText(option.label, nextQuery))
            : options
          setQuery(nextQuery)
          setActiveValue(nextMatches[0]?.value ?? '')
          setOpen(true)
        }}
        onBlur={() => {
          setOpen(false)
          setQuery(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            moveActiveOption(1)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            moveActiveOption(-1)
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            const activeOption = matchingOptions.find((option) => option.value === activeValue)
            if (activeOption) selectOption(activeOption)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            setQuery(null)
          } else if (event.key === 'Tab') {
            setOpen(false)
            setQuery(null)
          }
        }}
      />
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
          {matchingOptions.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="max-h-52 overflow-y-auto p-1.5"
              aria-label={placeholder ?? 'Options'}
            >
              {matchingOptions.map((option, index) => {
                const active = option.value === activeValue
                const selected = option.value === value
                return (
                  <li
                    key={option.value}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-label={option.label}
                    aria-selected={active}
                    className={cn(
                      'flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs outline-none',
                      active && 'bg-accent text-accent-foreground',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => setActiveValue(option.value)}
                    onClick={() => selectOption(option)}
                  >
                    <HighlightedText text={option.label} query={query ?? ''} />
                    {selected && (
                      <CheckIcon aria-hidden className="size-3.5 shrink-0 text-primary" />
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p role="status" className="px-3 py-3 text-xs text-muted-foreground">
              {noResultsLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
