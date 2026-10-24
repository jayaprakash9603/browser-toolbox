import { useState } from 'react'
import { ChevronDownIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LinkGroup, LinkSection, LinkStatusInfo, PageLink } from '@/core/engines/links/pageLinks'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { LinkRow } from './LinkRow'
import { SectionGlyph, SiteAvatar } from './LinkVisuals'

const GROUP_PAGE = 40

interface LinkGroupsProps {
  mode: 'sites' | 'sections'
  groups: LinkGroup[]
  statusOf: (href: string) => LinkStatusInfo | undefined
  expandedKey: string | null
  onToggleRow: (key: string) => void
  onLocate: (link: PageLink) => void
}

export function LinkGroups({ mode, groups, statusOf, expandedKey, onToggleRow, onLocate }: LinkGroupsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Set<string> | null>(null)
  const [limits, setLimits] = useState<Record<string, number>>({})
  const openKeys = open ?? new Set(groups.length <= 3 ? groups.map((group) => group.key) : [])
  const largest = Math.max(1, ...groups.map((group) => group.entries.length))
  const allOpen = groups.every((group) => openKeys.has(group.key))

  const toggle = (key: string) => {
    const next = new Set(openKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setOpen(next)
  }

  const label = (group: LinkGroup) => {
    if (mode === 'sections') return t(`web.links.section.${group.key}`)
    switch (group.kind) {
      case 'page':
        return t('web.links.group.page')
      case 'email':
        return t('web.links.group.email')
      case 'phone':
        return t('web.links.group.phone')
      case 'script':
        return t('web.links.group.script')
      case 'other':
        return t('web.links.group.other')
      default:
        return group.label
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-[11px] font-medium text-muted-foreground">
          {mode === 'sites' ? t('web.links.siteCount', { count: groups.length }) : t('web.links.sectionCount', { count: groups.length })}
        </p>
        <Button
          variant="ghost"
          size="xs"
          className="h-6 px-2 text-[11px] text-muted-foreground"
          onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((group) => group.key)))}
        >
          {allOpen ? <ChevronsDownUpIcon /> : <ChevronsUpDownIcon />}
          {allOpen ? t('web.links.collapseAll') : t('web.links.expandAll')}
        </Button>
      </div>
      <ul className="space-y-1">
        {groups.map((group) => {
          const expanded = openKeys.has(group.key)
          const count = group.entries.length
          const limit = limits[group.key] ?? GROUP_PAGE
          const panelId = `link-group-${mode}-${group.key.replace(/[^a-z0-9-]/gi, '_')}`
          return (
            <li key={group.key}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(group.key)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                  expanded && 'bg-accent/60',
                )}
              >
                {mode === 'sections' ? (
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    <SectionGlyph section={group.key as LinkSection} />
                  </span>
                ) : (
                  <SiteAvatar
                    host={group.label}
                    kind={group.kind === 'site' || group.kind === 'domain' ? 'internal' : group.kind}
                    size="sm"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">{label(group)}</span>
                    {group.kind === 'site' && mode === 'sites' && (
                      <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
                        {t('web.links.thisSite')}
                      </Badge>
                    )}
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className={cn('block h-full rounded-full', group.kind === 'site' ? 'bg-primary' : 'bg-primary/50')}
                      style={{ width: `${Math.max(4, (count / largest) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
                <ChevronDownIcon
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                    expanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              {expanded && (
                <div id={panelId} className="mt-1 mb-2 ml-5 space-y-1.5 border-l pl-2.5">
                  <ul className="space-y-1.5">
                    {group.entries.slice(0, limit).map((entry) => (
                      <LinkRow
                        key={entry.key}
                        entry={entry}
                        status={statusOf(entry.link.href)}
                        expanded={expandedKey === entry.key}
                        onToggle={onToggleRow}
                        onLocate={onLocate}
                        showSection={mode !== 'sections'}
                      />
                    ))}
                  </ul>
                  {count > limit && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="w-full"
                      onClick={() => setLimits((prev) => ({ ...prev, [group.key]: limit + GROUP_PAGE * 2 }))}
                    >
                      {t('web.links.showMore', { count: Math.min(count - limit, GROUP_PAGE * 2) })}
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
