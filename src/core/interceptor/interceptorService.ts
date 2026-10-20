import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { DEFAULT_INTERCEPTOR_SETTINGS } from './constants'
import type {
  InterceptorRule,
  InterceptorSettings,
  InterceptorState,
  LibraryItem,
  RuleGroup,
} from './types'

const DEFAULT_GROUP: RuleGroup = {
  id: 'default',
  name: 'Default',
  order: 0,
}

export async function getInterceptorState(): Promise<InterceptorState> {
  const [rules, groups, library, settings] = await Promise.all([
    get<InterceptorRule[]>(STORAGE_KEYS.interceptorRules),
    get<RuleGroup[]>(STORAGE_KEYS.interceptorGroups),
    get<LibraryItem[]>(STORAGE_KEYS.interceptorLibrary),
    get<Partial<InterceptorSettings>>(STORAGE_KEYS.interceptorSettings),
  ])
  return {
    rules: rules ?? [],
    groups: groups?.length ? groups : [DEFAULT_GROUP],
    library: library ?? [],
    settings: { ...DEFAULT_INTERCEPTOR_SETTINGS, ...settings },
  }
}

export async function saveRules(rules: InterceptorRule[]): Promise<void> {
  await set(STORAGE_KEYS.interceptorRules, rules)
}

export async function saveGroups(groups: RuleGroup[]): Promise<void> {
  await set(STORAGE_KEYS.interceptorGroups, groups)
}

export async function saveLibrary(library: LibraryItem[]): Promise<void> {
  await set(STORAGE_KEYS.interceptorLibrary, library)
}

export async function updateInterceptorSettings(
  patch: Partial<InterceptorSettings>,
): Promise<InterceptorSettings> {
  const state = await getInterceptorState()
  const next = { ...state.settings, ...patch }
  await set(STORAGE_KEYS.interceptorSettings, next)
  return next
}

export function newRuleId(): string {
  return crypto.randomUUID()
}

export async function upsertRule(rule: InterceptorRule): Promise<InterceptorRule[]> {
  const state = await getInterceptorState()
  const idx = state.rules.findIndex((r) => r.id === rule.id)
  const next = [...state.rules]
  const stamped = { ...rule, updatedAt: Date.now() }
  if (idx === -1) next.push(stamped)
  else next[idx] = stamped
  await saveRules(next)
  return next
}

export async function deleteRule(ruleId: string): Promise<InterceptorRule[]> {
  const state = await getInterceptorState()
  const next = state.rules.filter((r) => r.id !== ruleId)
  await saveRules(next)
  return next
}

export async function duplicateRule(ruleId: string): Promise<InterceptorRule | null> {
  const state = await getInterceptorState()
  const source = state.rules.find((r) => r.id === ruleId)
  if (!source) return null
  const copy: InterceptorRule = {
    ...source,
    id: newRuleId(),
    name: `${source.name} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
  }
  await saveRules([...state.rules, copy])
  return copy
}

export async function toggleRule(ruleId: string, enabled: boolean): Promise<void> {
  const state = await getInterceptorState()
  const next = state.rules.map((r) =>
    r.id === ruleId ? { ...r, enabled, updatedAt: Date.now() } : r,
  )
  await saveRules(next)
}

export async function togglePinRule(ruleId: string, pinned: boolean): Promise<void> {
  const state = await getInterceptorState()
  const next = state.rules.map((r) =>
    r.id === ruleId ? { ...r, pinned, updatedAt: Date.now() } : r,
  )
  await saveRules(next)
}

export async function moveRuleToGroup(ruleId: string, groupId: string): Promise<void> {
  const state = await getInterceptorState()
  const next = state.rules.map((r) =>
    r.id === ruleId ? { ...r, groupId, updatedAt: Date.now() } : r,
  )
  await saveRules(next)
}

export async function createGroup(name: string): Promise<RuleGroup[]> {
  const state = await getInterceptorState()
  const group: RuleGroup = {
    id: newRuleId(),
    name,
    order: state.groups.length,
    enabled: true,
  }
  const next = [...state.groups, group]
  await saveGroups(next)
  return next
}

export async function renameGroup(groupId: string, name: string): Promise<RuleGroup[]> {
  const state = await getInterceptorState()
  const next = state.groups.map((g) => (g.id === groupId ? { ...g, name } : g))
  await saveGroups(next)
  return next
}

export async function toggleGroup(groupId: string, enabled: boolean): Promise<RuleGroup[]> {
  const state = await getInterceptorState()
  const next = state.groups.map((g) => (g.id === groupId ? { ...g, enabled } : g))
  await saveGroups(next)
  return next
}

export async function setGroupCollapsed(groupId: string, collapsed: boolean): Promise<RuleGroup[]> {
  const state = await getInterceptorState()
  const next = state.groups.map((g) => (g.id === groupId ? { ...g, collapsed } : g))
  await saveGroups(next)
  return next
}

export async function deleteGroup(groupId: string): Promise<{ groups: RuleGroup[]; rules: InterceptorRule[] }> {
  if (groupId === 'default') {
    const state = await getInterceptorState()
    return { groups: state.groups, rules: state.rules }
  }
  const state = await getInterceptorState()
  const groups = state.groups.filter((g) => g.id !== groupId)
  const rules = state.rules.map((r) =>
    r.groupId === groupId ? { ...r, groupId: 'default', updatedAt: Date.now() } : r,
  )
  await saveGroups(groups.length ? groups : [DEFAULT_GROUP])
  await saveRules(rules)
  return { groups: groups.length ? groups : [DEFAULT_GROUP], rules }
}

export async function addRulesFromTemplate(
  rules: InterceptorRule[],
  groupName?: string,
): Promise<{ rules: InterceptorRule[]; groups: RuleGroup[]; firstId: string }> {
  const state = await getInterceptorState()
  let groups = state.groups
  let groupId = 'default'
  if (groupName) {
    const group: RuleGroup = {
      id: newRuleId(),
      name: groupName,
      order: groups.length,
      enabled: true,
    }
    groups = [...groups, group]
    groupId = group.id
    await saveGroups(groups)
  }
  const stamped = rules.map((r) => ({
    ...r,
    id: newRuleId(),
    groupId: r.groupId === 'default' || !groupName ? groupId : r.groupId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))
  const nextRules = [...state.rules, ...stamped]
  await saveRules(nextRules)
  return { rules: nextRules, groups, firstId: stamped[0]?.id ?? '' }
}

export async function upsertLibraryItem(item: LibraryItem): Promise<void> {
  const state = await getInterceptorState()
  const idx = state.library.findIndex((i) => i.id === item.id)
  const next = [...state.library]
  if (idx === -1) next.push(item)
  else next[idx] = item
  await saveLibrary(next)
}

export async function deleteLibraryItem(itemId: string): Promise<void> {
  const state = await getInterceptorState()
  await saveLibrary(state.library.filter((i) => i.id !== itemId))
}

export function subscribeInterceptorState(
  listener: (state: InterceptorState) => void,
): () => void {
  const onChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== 'local') return
    const keys = [
      STORAGE_KEYS.interceptorRules,
      STORAGE_KEYS.interceptorGroups,
      STORAGE_KEYS.interceptorLibrary,
      STORAGE_KEYS.interceptorSettings,
    ]
    if (!keys.some((k) => k in changes)) return
    void getInterceptorState().then(listener)
  }
  chrome.storage.onChanged.addListener(onChange)
  return () => chrome.storage.onChanged.removeListener(onChange)
}
