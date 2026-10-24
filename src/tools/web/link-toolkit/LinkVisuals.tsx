import type { ComponentType, ReactNode } from 'react'
import {
  CodeIcon,
  FileDownIcon,
  GlobeIcon,
  HashIcon,
  LinkIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LinkGroup, LinkKind, LinkSection, LinkStatusInfo } from '@/core/engines/links/pageLinks'
import { cn } from '@/shared/utils/cn'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

const KIND_ICON: Partial<Record<LinkKind | LinkGroup['kind'], IconType>> = {
  anchor: HashIcon,
  page: HashIcon,
  email: MailIcon,
  phone: PhoneIcon,
  script: CodeIcon,
  other: LinkIcon,
}

const KIND_TINT: Partial<Record<LinkKind | LinkGroup['kind'], string>> = {
  anchor: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  page: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  email: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  phone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  script: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
  other: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
}

function hueOf(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360
  return hash
}

/** Letter tile for a host, or a kind icon for non-web links. */
export function SiteAvatar({
  host,
  kind,
  size = 'md',
  download,
}: {
  host: string
  kind: LinkKind | LinkGroup['kind']
  size?: 'sm' | 'md' | 'lg'
  download?: boolean
}) {
  const box = size === 'lg' ? 'size-9 rounded-lg text-sm' : size === 'sm' ? 'size-6 rounded-md text-[11px]' : 'size-7 rounded-md text-xs'
  const icon = size === 'lg' ? 'size-4' : 'size-3.5'
  const KindIcon = download ? FileDownIcon : KIND_ICON[kind]
  if (KindIcon) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center', box, KIND_TINT[kind] ?? KIND_TINT.other)} aria-hidden>
        <KindIcon className={icon} aria-hidden />
      </span>
    )
  }
  if (!host) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center bg-muted text-muted-foreground', box)} aria-hidden>
        <GlobeIcon className={icon} aria-hidden />
      </span>
    )
  }
  const hue = hueOf(host)
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center font-semibold uppercase', box)}
      style={{ backgroundColor: `hsl(${hue} 70% 50% / 0.14)`, color: `hsl(${hue} 60% 38%)` }}
      aria-hidden
    >
      {host.replace(/^[^a-z0-9]+/i, '').charAt(0) || '?'}
    </span>
  )
}

/** Tiny page wireframe with the link's region filled in. */
export function SectionGlyph({ section, className }: { section: LinkSection; className?: string }) {
  const on = (region: LinkSection) => (section === region ? 'bg-primary' : 'bg-muted-foreground/25')
  return (
    <span
      className={cn('grid h-5 w-4 shrink-0 grid-cols-[1fr_4px] grid-rows-[3px_2px_1fr_3px] gap-[1.5px] rounded-[3px] border border-border p-[1.5px]', className)}
      aria-hidden
    >
      <span className={cn('col-span-2 rounded-[1px]', on('header'))} />
      <span className={cn('col-span-2 rounded-[1px]', on('nav'))} />
      <span className={cn('rounded-[1px]', section === 'other' ? 'bg-primary/50' : on('main'))} />
      <span className={cn('rounded-[1px]', on('aside'))} />
      <span className={cn('col-span-2 rounded-[1px]', on('footer'))} />
    </span>
  )
}

export function StatusPill({ info }: { info: LinkStatusInfo | undefined }) {
  const { t } = useTranslation()
  if (!info) return null
  if (info.checking) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        <Loader2Icon className="size-2.5 animate-spin motion-reduce:animate-none" aria-hidden />
        {t('web.links.status.checking')}
      </span>
    )
  }
  const label = info.status == null ? t('web.links.status.failed') : info.ok ? `${info.status} ${t('web.links.status.ok')}` : `${info.status} ${t('web.links.status.broken')}`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
        info.ok
          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
          : 'bg-destructive/12 text-destructive',
      )}
      title={info.error}
    >
      <span className={cn('size-1.5 rounded-full', info.ok ? 'bg-emerald-500' : 'bg-destructive')} aria-hidden />
      {label}
    </span>
  )
}

export function Tag({ children, tone = 'neutral', title }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'info'; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium whitespace-nowrap [&_svg]:size-2.5',
        tone === 'warning' && 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
        tone === 'info' && 'bg-primary/10 text-primary',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}
