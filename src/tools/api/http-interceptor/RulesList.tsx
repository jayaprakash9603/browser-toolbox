import { Fragment, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PinIcon,
  PlusIcon,
} from 'lucide-react'

import {
  createGroup,
  deleteGroup,
  deleteRule,
  duplicateRule,
  getInterceptorState,
  isRuleActive,
  moveRuleToGroup,
  renameGroup,
  saveRules,
  setGroupCollapsed,
  toggleGroup,
  togglePinRule,
  toggleRule,
  type InterceptorRule,
  type InterceptorState,
} from '@/core/interceptor'
import { exportRulesJson } from '@/core/interceptor/importers/requestly'
import { importRequestlyJson } from '@/core/interceptor/importers/requestly'
import { ALL_RULE_TYPES, ruleTypeBadge } from '@/features/interceptor/ruleTypeMeta'
import type { RulesNav } from '@/features/interceptor/useRulesNav'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { RULE_TYPE_LABELS } from '@/features/interceptor/ruleTypeMeta'
import { cn } from '@/shared/utils/cn'

type FilterChip = 'all' | 'pinned' | 'active'

interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
  nav: RulesNav
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function RulesList({ state, onStateChange, nav }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState<FilterChip>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const groups = state.groups.filter((g) => g.id !== 'default').sort((a, b) => a.order - b.order)
  const defaultRules = state.rules.filter((r) => r.groupId === 'default')

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.rules.filter((r) => {
      if (chip === 'pinned' && !r.pinned) return false
      if (chip === 'active' && !isRuleActive(r, state.groups)) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.type.includes(q)
    })
  }, [state.rules, state.groups, query, chip])

  const activeCount = state.rules.filter((r) => isRuleActive(r, state.groups)).length

  const refresh = () => void getInterceptorState().then((s) => onStateChange(s))

  const allGroups = useMemo(
    () => [{ id: 'default', name: 'Default' }, ...groups.map((g) => ({ id: g.id, name: g.name }))],
    [groups],
  )

  const setRules = async (rules: InterceptorRule[]) => {
    await saveRules(rules)
    onStateChange({ ...state, rules })
  }

  const bulkSetEnabled = (enabled: boolean) => {
    const ids = selected
    if (!ids.size) return
    const next = state.rules.map((r) =>
      ids.has(r.id) ? { ...r, enabled, updatedAt: Date.now() } : r,
    )
    void setRules(next).then(() => setSelected(new Set()))
  }

  const bulkDelete = () => {
    if (!selected.size) return
    if (!window.confirm(t('interceptor.rules.bulkDelete') + '?')) return
    const ids = selected
    void setRules(state.rules.filter((r) => !ids.has(r.id))).then(() => setSelected(new Set()))
  }

  const bulkExport = () => {
    const rules = state.rules.filter((r) => selected.has(r.id))
    if (!rules.length) return
    void navigator.clipboard.writeText(exportRulesJson(rules, state.groups))
  }

  const moveRulesToGroup = (ruleIds: Iterable<string>, groupId: string) => {
    const ids = new Set(ruleIds)
    const next = state.rules.map((r) =>
      ids.has(r.id) ? { ...r, groupId, updatedAt: Date.now() } : r,
    )
    return setRules(next)
  }

  const onImport = async (file: File) => {
    const text = await file.text()
    const { rules: imported } = importRequestlyJson(text)
    if (!imported.length) return
    const next = [...state.rules, ...imported]
    await saveRules(next)
    onStateChange({ ...state, rules: next })
  }

  const renderRuleRow = (rule: InterceptorRule) => {
    if (!filteredRules.includes(rule)) return null
    return (
      <tr key={rule.id} className="border-b hover:bg-muted/40">
        <td className="w-8 px-2">
          <input
            type="checkbox"
            checked={selected.has(rule.id)}
            onChange={(e) => {
              const next = new Set(selected)
              if (e.target.checked) next.add(rule.id)
              else next.delete(rule.id)
              setSelected(next)
            }}
          />
        </td>
        <td className="w-8 px-1">
          <button
            type="button"
            aria-label="Pin"
            onClick={() => void togglePinRule(rule.id, !rule.pinned).then(refresh)}
          >
            <PinIcon className={cn('size-3.5', rule.pinned ? 'text-primary' : 'text-muted-foreground/40')} />
          </button>
        </td>
        <td className="max-w-0 truncate px-2 py-1.5">
          <button type="button" className="font-medium hover:underline" onClick={() => nav.goEditor(rule.id)}>
            {rule.name}
          </button>
        </td>
        <td className="hidden px-2 text-[10px] font-semibold tracking-wide text-muted-foreground @[520px]:table-cell">
          {ruleTypeBadge(rule.type)}
        </td>
        <td className="w-16 px-2">
          <Switch
            checked={rule.enabled}
            onCheckedChange={(on) => void toggleRule(rule.id, on).then(refresh)}
            aria-label={rule.name}
          />
        </td>
        <td className="hidden w-24 px-2 text-muted-foreground @[520px]:table-cell">{formatDate(rule.updatedAt)}</td>
        <td className="w-8 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => nav.goEditor(rule.id)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void duplicateRule(rule.id).then(refresh)}>Duplicate</DropdownMenuItem>
              {allGroups.map((g) => (
                <DropdownMenuItem key={g.id} onClick={() => void moveRuleToGroup(rule.id, g.id).then(refresh)}>
                  {t('interceptor.rules.moveToGroup')}: {g.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => void navigator.clipboard.writeText(exportRulesJson([rule], state.groups))}
              >
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void togglePinRule(rule.id, !rule.pinned).then(refresh)}>
                {rule.pinned ? t('interceptor.rules.unpin') : t('interceptor.rules.pin')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm('Delete this rule?')) void deleteRule(rule.id).then(refresh)
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }

  const empty = state.rules.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('interceptor.searchRules')}
          className="h-8 max-w-xs text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {(['all', 'pinned', 'active'] as FilterChip[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setChip(id)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs',
                chip === id ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
            >
              {id === 'all' && t('interceptor.rules.filterAll', { count: state.rules.length })}
              {id === 'pinned' && t('interceptor.rules.filterPinned')}
              {id === 'active' && t('interceptor.rules.filterActive', { count: activeCount })}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const name = window.prompt('Group name')
              if (name) void createGroup(name).then(() => refresh())
            }}
          >
            {t('interceptor.rules.newGroup')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            {t('interceptor.import')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImport(f)
              e.target.value = ''
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm">
                <PlusIcon className="size-3.5" />
                {t('interceptor.newRule')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 overflow-y-auto">
              {ALL_RULE_TYPES.map((type) => (
                <DropdownMenuItem key={type} onClick={() => nav.goNewRule(type)}>
                  {RULE_TYPE_LABELS[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {empty ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="mb-4 text-sm font-medium">{t('interceptor.rules.emptyTitle')}</p>
          <div className="grid gap-2 @[480px]:grid-cols-2">
            {ALL_RULE_TYPES.slice(0, 6).map((type) => (
              <Button key={type} type="button" variant="outline" size="sm" onClick={() => nav.goNewRule(type)}>
                {RULE_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
          <Button type="button" variant="link" className="mt-3" onClick={nav.goTemplates}>
            {t('interceptor.rules.browseTemplates')}
          </Button>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <span className="text-sm font-medium">{t('interceptor.rules.bulkSelected', { count: selected.size })}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => bulkSetEnabled(true)}>
                {t('interceptor.rules.bulkActivate')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => bulkSetEnabled(false)}>
                {t('interceptor.rules.bulkDeactivate')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">{t('interceptor.rules.bulkMove')}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {allGroups.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onClick={() => void moveRulesToGroup(selected, g.id).then(() => setSelected(new Set()))}
                    >
                      {g.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" size="sm" onClick={bulkExport}>
                {t('interceptor.rules.bulkExport')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={bulkDelete}>
                {t('interceptor.rules.bulkDelete')}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5" />
                <th className="px-1" />
                <th className="px-2 py-1.5">{t('interceptor.rules.colRules')}</th>
                <th className="hidden px-2 @[520px]:table-cell">{t('interceptor.rules.colType')}</th>
                <th className="px-2">{t('interceptor.rules.colStatus')}</th>
                <th className="hidden px-2 @[520px]:table-cell">{t('interceptor.rules.colUpdated')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const rules = state.rules.filter((r) => r.groupId === group.id)
                const visible = rules.some((r) => filteredRules.includes(r))
                if (!visible && query) return null
                const activeInGroup = rules.filter((r) => isRuleActive(r, state.groups)).length
                return (
                  <Fragment key={group.id}>
                    <tr className="bg-muted/20">
                      <td colSpan={7} className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void setGroupCollapsed(group.id, !group.collapsed).then(refresh)}
                          >
                            {group.collapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                          </button>
                          <span className="font-medium">{group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {activeInGroup}/{rules.length}
                          </span>
                          <Switch
                            className="ml-2"
                            checked={group.enabled !== false}
                            onCheckedChange={(on) => void toggleGroup(group.id, on).then(refresh)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-xs" className="ml-auto">
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  const name = window.prompt('Rename group', group.name)
                                  if (name) void renameGroup(group.id, name).then(refresh)
                                }}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (window.confirm('Delete group? Rules move to Default.'))
                                    void deleteGroup(group.id).then((r) => onStateChange({ ...state, ...r }))
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                    {!group.collapsed && rules.map((r) => renderRuleRow(r))}
                  </Fragment>
                )
              })}
              {defaultRules.map((r) => renderRuleRow(r))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
