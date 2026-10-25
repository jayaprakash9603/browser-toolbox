import {
  BookOpenTextIcon,
  CheckIcon,
  CodeIcon,
  PlayIcon,
  PlusIcon,
  ShieldIcon,
  SparklesIcon,
  TerminalIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  GALLERY_CATEGORIES,
  GALLERY_SCRIPTS,
  galleryInstallUrl,
  type GalleryCategory,
  type GalleryScript,
  type ScriptRecord,
} from '@/core/script-studio'
import { CodeEditor } from '@/shared/components/CodeEditor'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { cn } from '@/shared/utils/cn'

const CATEGORY_ICONS: Record<GalleryCategory, LucideIcon> = {
  ai: SparklesIcon,
  productivity: ZapIcon,
  reading: BookOpenTextIcon,
  video: PlayIcon,
  privacy: ShieldIcon,
  developer: TerminalIcon,
  social: UsersIcon,
}

type Props = {
  scripts: ScriptRecord[]
  onInstall: (item: GalleryScript) => Promise<string>
  onOpen: (id: string) => void
}

export function GalleryView({ scripts, onInstall, onOpen }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<GalleryCategory | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [preview, setPreview] = useState<GalleryScript | null>(null)

  const installed = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of scripts) if (!s.trashed && s.installUrl) map.set(s.installUrl, s.id)
    return map
  }, [scripts])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GALLERY_SCRIPTS.filter(
      (s) =>
        (category === 'all' || s.category === category) &&
        (!q || `${s.name} ${s.description} ${s.sites}`.toLowerCase().includes(q)),
    )
  }, [query, category])

  const install = async (item: GalleryScript) => {
    setBusy(item.id)
    try {
      await onInstall(item)
    } finally {
      setBusy(null)
    }
  }

  const chips: (GalleryCategory | 'all')[] = ['all', ...GALLERY_CATEGORIES]

  return (
    <div className="flex flex-col gap-3 @container">
      <SearchInput value={query} onChange={setQuery} placeholder={t('scriptStudio.gallery.search')} />

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none" role="group" aria-label={t('scriptStudio.gallery.categories')}>
        {chips.map((id) => {
          const Icon = id === 'all' ? null : CATEGORY_ICONS[id]
          const active = category === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(id)}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
              {t(`scriptStudio.gallery.category.${id}`)}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={SparklesIcon} title={t('scriptStudio.gallery.empty')} />
      ) : (
        <ul className="grid grid-cols-1 gap-2 @[560px]:grid-cols-2 @[900px]:grid-cols-3">
          {items.map((item, i) => {
            const Icon = CATEGORY_ICONS[item.category]
            const installedId = installed.get(galleryInstallUrl(item.id))
            return (
              <motion.li
                key={item.id}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : Math.min(i, 12) * 0.02, duration: 0.2 }}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <Icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5">{item.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.sites}</p>
                  </div>
                </div>
                <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">{item.description}</p>
                <div className="mt-auto flex items-center gap-2">
                  {!item.enabledByDefault && !installedId ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {t('scriptStudio.gallery.offByDefault')}
                    </Badge>
                  ) : null}
                  <div className="ms-auto flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => setPreview(item)}>
                      <CodeIcon className="size-3.5" aria-hidden />
                      {t('scriptStudio.gallery.view')}
                    </Button>
                    {installedId ? (
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 text-xs" onClick={() => onOpen(installedId)}>
                        <CheckIcon className="size-3.5 text-emerald-500" aria-hidden />
                        {t('scriptStudio.gallery.added')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 gap-1 px-2.5 text-xs"
                        disabled={busy === item.id}
                        onClick={() => void install(item)}
                      >
                        <PlusIcon className="size-3.5" aria-hidden />
                        {t('scriptStudio.gallery.add')}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview ? (
            <>
              <DialogHeader>
                <DialogTitle>{preview.name}</DialogTitle>
                <DialogDescription>{preview.description}</DialogDescription>
              </DialogHeader>
              <CodeEditor
                value={preview.code}
                readOnly
                wrap
                language="javascript"
                className="h-[55vh] min-h-[240px]"
                ariaLabel={preview.name}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
