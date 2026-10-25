import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookmarkIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { EASE_OUT } from './labels'
import { LIBRARY, LIBRARY_TAGS, type LibraryTag } from './library'
import type { SavedPalette } from './paletteModel'
import { ChipGroup } from './parts'

type Filter = 'all' | 'saved' | LibraryTag

interface LibraryPanelProps {
  saved: SavedPalette[]
  onApply: (colors: readonly string[]) => void
  onDelete: (id: string) => void
}

interface Card {
  id: string
  name: string
  colors: readonly string[]
  tags: readonly LibraryTag[]
  savedId?: string
}

export function LibraryPanel({ saved, onApply, onDelete }: LibraryPanelProps) {
  const { t } = useTranslation()
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const savedCards: Card[] = saved.map((item) => ({ id: `saved-${item.id}`, name: item.name, colors: item.colors, tags: [], savedId: item.id }))
  const source: Card[] = filter === 'saved' ? savedCards : filter === 'all' ? [...savedCards, ...LIBRARY] : LIBRARY.filter((p) => p.tags.includes(filter))
  const needle = query.trim().toLowerCase()
  const cards = needle
    ? source.filter(
        (card) =>
          card.name.toLowerCase().includes(needle) ||
          card.colors.some((hex) => hex.includes(needle.replace('#', ''))) ||
          card.tags.some((tag) => t(`pg.tag.${tag}`).toLowerCase().includes(needle)),
      )
    : source

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
      <div>
        <h2 className="text-sm font-semibold">{t('pg.library.title')}</h2>
        <p className="text-[11px] text-muted-foreground">{t('pg.library.hint', { count: LIBRARY.length })}</p>
      </div>
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {t('pg.library.search')}
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={searchId} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('pg.library.search')} className="pl-8" />
      </div>
      <ChipGroup
        label={t('pg.library.filter')}
        layoutId="pg-library-filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('pg.tag.all') },
          { value: 'saved', label: t('pg.tag.saved', { count: saved.length }), icon: <BookmarkIcon /> },
          ...LIBRARY_TAGS.map((tag) => ({ value: tag, label: t(`pg.tag.${tag}`) })),
        ]}
      />

      {cards.length === 0 ? (
        <motion.p
          key={`${filter}-empty`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted-foreground"
        >
          {filter === 'saved' && !needle ? t('pg.library.noSaved') : t('pg.library.empty')}
        </motion.p>
      ) : (
        <motion.ul layout className="grid grid-cols-1 gap-2 @[380px]:grid-cols-2 @[680px]:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {cards.map((card, index) => (
              <motion.li
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                transition={{ duration: 0.32, delay: Math.min(index, 12) * 0.025, ease: EASE_OUT }}
                className="group/card relative"
              >
                <button
                  type="button"
                  onClick={() => onApply(card.colors)}
                  aria-label={t('pg.library.apply', { name: card.name })}
                  className="flex w-full cursor-pointer flex-col gap-2 rounded-xl border bg-background/60 p-2 text-left outline-none transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0"
                >
                  <span className="flex h-14 overflow-hidden rounded-lg" aria-hidden>
                    {card.colors.map((hex, colorIndex) => (
                      <span
                        key={`${hex}-${colorIndex}`}
                        className="flex-1 transition-[flex-grow] duration-300 ease-out hover:flex-[2.4]"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 pr-7">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">{card.name}</span>
                    {card.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] leading-4 text-muted-foreground">
                        {t(`pg.tag.${tag}`)}
                      </span>
                    ))}
                  </span>
                </button>
                {card.savedId && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1.5 bottom-1.5"
                    onClick={() => onDelete(card.savedId!)}
                    aria-label={t('pg.library.delete', { name: card.name })}
                    title={t('pg.library.delete', { name: card.name })}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </section>
  )
}
