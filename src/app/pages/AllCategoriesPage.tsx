import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { LayoutGridIcon, SearchXIcon, SparklesIcon } from 'lucide-react'

import { categoryRegistry, toolRegistry, type CategoryDefinition, type ToolDefinition } from '@/core/registry'
import { CategoryCard } from '@/app/pages/home/CategoryCard'
import { getToolSearchLabels } from '@/i18n/toolLabels'
import { BackButton } from '@/shared/components/BackButton'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'

const EASE = [0.22, 1, 0.36, 1] as const
const ORBIT_COUNT = 6

interface Entry {
  category: CategoryDefinition
  tools: ToolDefinition[]
}

export default function AllCategoriesPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const entries = useMemo<Entry[]>(
    () =>
      [...categoryRegistry.getAll()]
        .sort((a, b) => a.order - b.order)
        .map((category) => ({ category, tools: toolRegistry.getByCategory(category.id) })),
    [],
  )
  const available = entries.filter((e) => e.category.enabled && e.tools.length > 0)
  const toolTotal = available.reduce((sum, e) => sum + e.tools.length, 0)

  const search = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!search) return entries.map((entry) => ({ ...entry, matches: undefined as number | undefined }))
    return entries.flatMap((entry) => {
      const label = [
        t(`categories.${entry.category.id}.name`, { defaultValue: entry.category.name }),
        t(`categories.${entry.category.id}.description`, { defaultValue: entry.category.description }),
      ]
        .join(' ')
        .toLowerCase()
      const matching = entry.tools.filter((tool) =>
        [...getToolSearchLabels(tool), ...tool.keywords].join(' ').toLowerCase().includes(search),
      ).length
      if (!label.includes(search) && matching === 0) return []
      return [{ ...entry, matches: label.includes(search) ? undefined : matching }]
    })
  }, [entries, search, t])

  return (
    <MotionConfig reducedMotion="user">
      <div className="scrollbar-styled @container h-full overflow-x-clip overflow-y-auto px-[var(--density-page-pad)] pt-3 pb-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="flex items-center gap-2">
            <BackButton to="/" />
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{t('allCategories.title')}</h1>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative flex items-center gap-4 overflow-hidden rounded-3xl border bg-card p-4 @[420px]:gap-6 @[420px]:p-5"
          >
            <div className="min-w-0 flex-1">
              <span className="mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                <SparklesIcon className="size-3" aria-hidden />
                {t('allCategories.eyebrow')}
              </span>
              <h2 className="text-lg leading-tight font-semibold tracking-tight text-balance @[420px]:text-xl">
                {t('allCategories.heroTitle')}
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {t('allCategories.heroBody', { categories: available.length, tools: toolTotal })}
              </p>
            </div>
            <Orbit categories={available.slice(0, ORBIT_COUNT).map((e) => e.category)} />
          </motion.section>

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t('allCategories.search')}
            ariaLabel={t('allCategories.search')}
            shortcut="/"
          />

          {results.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={t('allCategories.noMatches', { query: query.trim() })}
              description={t('allCategories.noMatchesHint')}
            />
          ) : (
            <motion.ul layout className="grid grid-cols-2 gap-2 @[560px]:grid-cols-3 @[820px]:grid-cols-4">
              <AnimatePresence initial mode="popLayout">
                {results.map(({ category, tools, matches }, index) => (
                  <motion.li
                    key={category.id}
                    layout="position"
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.14 } }}
                    transition={{ duration: 0.32, ease: EASE, delay: search ? 0 : Math.min(index, 16) * 0.03 }}
                    className="min-w-0"
                  >
                    <CategoryCard category={category} tools={tools} matches={matches} detailed />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>
    </MotionConfig>
  )
}

/** Category icons circling a center badge; decorative, paused for reduced motion. */
function Orbit({ categories }: { categories: readonly CategoryDefinition[] }) {
  const radius = 50
  return (
    <div aria-hidden className="relative hidden size-32 shrink-0 @[340px]:block">
      <span className="absolute inset-0 rounded-full border border-dashed" />
      <span className="absolute inset-[26%] rounded-full border" />
      <span className="absolute top-[12%] right-[6%] size-1.5 rounded-full bg-primary/60 motion-safe:animate-pulse" />
      <span className="absolute bottom-[10%] left-[8%] size-1 rounded-full bg-primary/40 motion-safe:animate-pulse [animation-delay:700ms]" />
      <span className="absolute top-[46%] -left-1 size-1 rounded-full bg-foreground/25 motion-safe:animate-pulse [animation-delay:1400ms]" />

      <motion.span
        className="absolute inset-[34%] flex items-center justify-center rounded-2xl border bg-background text-primary"
        initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
      >
        <LayoutGridIcon className="size-5" />
      </motion.span>

      <div className="absolute inset-0 motion-safe:animate-[spin_36s_linear_infinite]">
        {categories.map((category, index) => {
          const Icon = category.icon
          const angle = (360 / categories.length) * index
          return (
            <span
              key={category.id}
              className="absolute top-1/2 left-1/2 -mt-3.5 -ml-3.5"
              style={{ transform: `rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)` }}
            >
              <motion.span
                className="block"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.25 + index * 0.06 }}
              >
                <span className="flex size-7 items-center justify-center rounded-lg border bg-background text-foreground/70 motion-safe:animate-[spin_36s_linear_infinite_reverse] [&_svg]:size-3.5">
                  <Icon />
                </span>
              </motion.span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
