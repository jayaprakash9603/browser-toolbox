import {
  INBOX_ID,
  addDays,
  dayKey,
  isOverdue,
  isSameDay,
  linkHost,
  normalizeTasksData,
  startOfDay,
  type Task,
  type TaskLink,
  type TaskProject,
  type TaskSort,
  type TasksData,
} from '@/core/tasks/model'
import type { ParsedKind, ParsedToken } from '@/core/tasks/parse'

// ── Views ─────────────────────────────────────────────────────────────────────

export type ParsedView =
  | { kind: 'today' }
  | { kind: 'upcoming' }
  | { kind: 'inbox' }
  | { kind: 'completed' }
  | { kind: 'project'; project: TaskProject }
  | { kind: 'label'; label: string }

export function parseView(id: string, data: TasksData): ParsedView {
  if (id === 'upcoming' || id === 'inbox' || id === 'completed') return { kind: id }
  if (id.startsWith('project:')) {
    const project = data.projects.find((p) => p.id === id.slice(8))
    if (project) return { kind: 'project', project }
  }
  if (id.startsWith('label:') && id.length > 6) return { kind: 'label', label: id.slice(6) }
  return { kind: 'today' }
}

export function viewId(view: ParsedView): string {
  if (view.kind === 'project') return `project:${view.project.id}`
  if (view.kind === 'label') return `label:${view.label}`
  return view.kind
}

export type SectionKind = 'overdue' | 'day' | 'later' | 'all' | 'completedDay' | 'results' | 'completedResults'

export interface TaskSection {
  id: string
  kind: SectionKind
  date?: number
  tasks: Task[]
}

/** Upcoming lists each of the next two weeks' days; anything further is grouped as "Later". */
export const UPCOMING_DAYS = 14
export const COMPLETED_PAGE = 60

// ── Sorting ───────────────────────────────────────────────────────────────────

function smartCompare(a: Task, b: Task): number {
  const dayA = a.due == null ? Number.POSITIVE_INFINITY : startOfDay(a.due)
  const dayB = b.due == null ? Number.POSITIVE_INFINITY : startOfDay(b.due)
  if (dayA !== dayB) return dayA - dayB
  if (a.due != null && b.due != null) {
    // Within a day, tasks with a time come first, in time order.
    if (a.allDay !== b.allDay) return a.allDay ? 1 : -1
    if (!a.allDay && a.due !== b.due) return a.due - b.due
  }
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.createdAt - b.createdAt
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const list = [...tasks]
  switch (sort) {
    case 'priority':
      return list.sort((a, b) => a.priority - b.priority || smartCompare(a, b))
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    case 'created':
      return list.sort((a, b) => b.createdAt - a.createdAt)
    case 'due':
      return list.sort((a, b) => {
        const dueA = a.due ?? Number.POSITIVE_INFINITY
        const dueB = b.due ?? Number.POSITIVE_INFINITY
        return dueA - dueB || a.createdAt - b.createdAt
      })
    default:
      return list.sort(smartCompare)
  }
}

// ── Search ────────────────────────────────────────────────────────────────────

export function matchesQuery(task: Task, query: string, projects: TaskProject[]): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const project = projects.find((p) => p.id === task.projectId)
  const haystack = [
    task.title,
    task.notes,
    task.link?.title ?? '',
    task.link?.url ?? '',
    ...task.labels.map((l) => `@${l}`),
    ...task.subtasks.map((s) => s.title),
    project ? `#${project.name}` : '',
  ]
    .join('\n')
    .toLowerCase()
  return words.every((word) => haystack.includes(word))
}

// ── Sections ──────────────────────────────────────────────────────────────────

function inScope(task: Task, view: ParsedView, now: number): boolean {
  switch (view.kind) {
    case 'today':
      return task.due != null && (isOverdue(task, now) || isSameDay(task.due, now))
    case 'upcoming':
      return task.due != null
    case 'inbox':
      return task.projectId === INBOX_ID
    case 'project':
      return task.projectId === view.project.id
    case 'label':
      return task.labels.some((l) => l.toLowerCase() === view.label.toLowerCase())
    default:
      return true
  }
}

function groupByDay(tasks: Task[], dayOf: (task: Task) => number): Map<number, Task[]> {
  const groups = new Map<number, Task[]>()
  for (const task of tasks) {
    const day = startOfDay(dayOf(task))
    const list = groups.get(day)
    if (list) list.push(task)
    else groups.set(day, [task])
  }
  return groups
}

export function buildSections(
  view: ParsedView,
  tasks: Task[],
  projects: TaskProject[],
  now: number,
  sort: TaskSort,
  query = '',
  completedLimit = COMPLETED_PAGE,
): TaskSection[] {
  if (query.trim()) {
    const found = tasks.filter((t) => matchesQuery(t, query, projects))
    const open = sortTasks(found.filter((t) => !t.completed), sort)
    const done = found
      .filter((t) => t.completed)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, completedLimit)
    return [
      { id: 'results', kind: 'results' as const, tasks: open },
      { id: 'completed-results', kind: 'completedResults' as const, tasks: done },
    ].filter((s) => s.tasks.length > 0)
  }

  if (view.kind === 'completed') {
    const done = tasks
      .filter((t) => t.completed)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, completedLimit)
    return [...groupByDay(done, (t) => t.completedAt ?? t.updatedAt)].map(([date, list]) => ({
      id: `done-${dayKey(date)}`,
      kind: 'completedDay' as const,
      date,
      tasks: list,
    }))
  }

  const open = tasks.filter((t) => !t.completed && inScope(t, view, now))

  if (view.kind === 'today' || view.kind === 'upcoming') {
    const today = startOfDay(now)
    const overdue = sortTasks(
      open.filter((t) => isOverdue(t, now)),
      sort,
    )
    const sections: TaskSection[] = []
    if (overdue.length) sections.push({ id: 'overdue', kind: 'overdue', tasks: overdue })
    const upcoming = open.filter((t) => !isOverdue(t, now))
    const horizon = view.kind === 'today' ? 1 : UPCOMING_DAYS
    const days = groupByDay(
      upcoming.filter((t) => (t.due as number) < addDays(today, horizon)),
      (t) => t.due as number,
    )
    for (let offset = 0; offset < horizon; offset += 1) {
      const date = addDays(today, offset)
      const list = days.get(date) ?? []
      // Today always shows its own heading so the composer has somewhere to land.
      if (list.length || (offset === 0 && view.kind === 'today')) {
        sections.push({ id: `day-${dayKey(date)}`, kind: 'day', date, tasks: sortTasks(list, sort) })
      }
    }
    if (view.kind === 'upcoming') {
      const later = upcoming.filter((t) => (t.due as number) >= addDays(today, horizon))
      if (later.length) sections.push({ id: 'later', kind: 'later', tasks: sortTasks(later, sort) })
    }
    return sections
  }

  return [{ id: 'all', kind: 'all', tasks: sortTasks(open, sort) }]
}

/** Recently completed tasks belonging to the view, shown collapsed under the list. */
export function completedInView(view: ParsedView, tasks: Task[], now: number): Task[] {
  if (view.kind === 'completed' || view.kind === 'upcoming') return []
  const today = startOfDay(now)
  return tasks
    .filter((t) => t.completed)
    .filter((t) =>
      view.kind === 'today'
        ? (t.completedAt ?? 0) >= today
        : view.kind === 'inbox'
          ? t.projectId === INBOX_ID
          : view.kind === 'project'
            ? t.projectId === view.project.id
            : t.labels.some((l) => l.toLowerCase() === view.label.toLowerCase()),
    )
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 30)
}

// ── Counts & progress ─────────────────────────────────────────────────────────

export interface ViewCounts {
  today: number
  overdue: number
  inbox: number
  upcoming: number
  projects: Record<string, number>
  labels: Record<string, number>
}

export function viewCounts(tasks: Task[], now: number): ViewCounts {
  const today = startOfDay(now)
  const weekEnd = addDays(today, 7)
  const counts: ViewCounts = { today: 0, overdue: 0, inbox: 0, upcoming: 0, projects: {}, labels: {} }
  for (const task of tasks) {
    if (task.completed) continue
    const overdue = isOverdue(task, now)
    if (overdue) counts.overdue += 1
    if (task.due != null && (overdue || isSameDay(task.due, now))) counts.today += 1
    if (task.due != null && task.due >= today && task.due < weekEnd) counts.upcoming += 1
    if (task.projectId === INBOX_ID) counts.inbox += 1
    else counts.projects[task.projectId] = (counts.projects[task.projectId] ?? 0) + 1
    for (const label of task.labels) {
      const key = label.toLowerCase()
      counts.labels[key] = (counts.labels[key] ?? 0) + 1
    }
  }
  return counts
}

export interface Progress {
  done: number
  total: number
}

export function viewProgress(view: ParsedView, tasks: Task[], now: number): Progress | null {
  if (view.kind === 'upcoming' || view.kind === 'completed') return null
  if (view.kind === 'today') {
    const today = startOfDay(now)
    const done = tasks.filter((t) => t.completed && (t.completedAt ?? 0) >= today).length
    const remaining = tasks.filter(
      (t) => !t.completed && t.due != null && (isOverdue(t, now) || isSameDay(t.due, now)),
    ).length
    return { done, total: done + remaining }
  }
  const scoped = tasks.filter((t) => inScope(t, view, now))
  return { done: scoped.filter((t) => t.completed).length, total: scoped.length }
}

/** Labels in use, most used first. */
export function allLabels(tasks: Task[]): string[] {
  const usage = new Map<string, { name: string; count: number }>()
  for (const task of tasks) {
    for (const label of task.labels) {
      const key = label.toLowerCase()
      const entry = usage.get(key)
      if (entry) entry.count += task.completed ? 0 : 1
      else usage.set(key, { name: label, count: task.completed ? 0 : 1 })
    }
  }
  return [...usage.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((entry) => entry.name)
}

export function taskLoadByDay(tasks: Task[]): Map<string, number> {
  const load = new Map<string, number>()
  for (const task of tasks) {
    if (task.completed || task.due == null) continue
    const key = dayKey(task.due)
    load.set(key, (load.get(key) ?? 0) + 1)
  }
  return load
}

// ── Due labels ────────────────────────────────────────────────────────────────

export type DueTone = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'

export interface DayWords {
  today: string
  tomorrow: string
  yesterday: string
}

export function dueTone(due: number, allDay: boolean, now: number): DueTone {
  const today = startOfDay(now)
  if (allDay ? due < today : due < now) return 'overdue'
  if (isSameDay(due, now)) return 'today'
  if (isSameDay(due, addDays(today, 1))) return 'tomorrow'
  if (due < addDays(today, 7)) return 'week'
  return 'later'
}

export function formatDay(day: number, now: number, words: DayWords): string {
  const today = startOfDay(now)
  const target = startOfDay(day)
  if (target === today) return words.today
  if (target === addDays(today, 1)) return words.tomorrow
  if (target === addDays(today, -1)) return words.yesterday
  if (target > today && target < addDays(today, 7)) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(target)
  }
  const sameYear = new Date(target).getFullYear() === new Date(now).getFullYear()
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(target)
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(ms)
}

export function formatDue(due: number, allDay: boolean, now: number, words: DayWords): string {
  const day = formatDay(due, now, words)
  return allDay ? day : `${day} ${formatTime(due)}`
}

export function formatShortDate(day: number): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(day)
}

export function formatWeekday(day: number): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(ms)
}

// ── Quick due choices ─────────────────────────────────────────────────────────

export type QuickDue = 'today' | 'tomorrow' | 'weekend' | 'nextWeek'

export function quickDueDay(choice: QuickDue, now: number): number {
  const today = startOfDay(now)
  const weekday = new Date(now).getDay()
  switch (choice) {
    case 'today':
      return today
    case 'tomorrow':
      return addDays(today, 1)
    case 'weekend':
      return addDays(today, weekday === 6 || weekday === 0 ? 0 : 6 - weekday)
    case 'nextWeek':
      return addDays(today, ((1 - weekday + 7) % 7) || 7)
  }
}

// ── Calendar ──────────────────────────────────────────────────────────────────

/** First weekday of the browser locale: 0 Sunday, 1 Monday, 6 Saturday. */
export function localeWeekStart(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const info = locale.getWeekInfo?.() ?? locale.weekInfo
    if (info && Number.isInteger(info.firstDay)) return info.firstDay % 7
  } catch {
    /* older engines */
  }
  return 0
}

export function monthGrid(viewMonth: number, weekStart: number): Array<number | null> {
  const first = new Date(viewMonth)
  first.setDate(1)
  first.setHours(0, 0, 0, 0)
  const lead = (first.getDay() - weekStart + 7) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: Array<number | null> = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day).getTime())
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function weekdayHeaders(weekStart: number): string[] {
  const format = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2023, 0, 1 + ((weekStart + i) % 7))))
}

// ── Quick add helpers ─────────────────────────────────────────────────────────

function projectKey(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '')
}

export function findProject(name: string | null, projects: TaskProject[]): TaskProject | null {
  if (!name) return null
  const key = projectKey(name)
  if (key === 'inbox') return null
  return projects.find((p) => projectKey(p.name) === key) ?? null
}

export function isInboxName(name: string | null): boolean {
  return name != null && projectKey(name) === 'inbox'
}

export function removeTokens(text: string, tokens: ParsedToken[], kinds: ParsedKind[]): string {
  let next = text
  for (const token of [...tokens].filter((t) => kinds.includes(t.kind)).sort((a, b) => b.start - a.start)) {
    next = next.slice(0, token.start) + next.slice(token.end)
  }
  return next.replace(/\s{2,}/g, ' ').trimStart()
}

export function prettyUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : decodeURIComponent(parsed.pathname)
    return `${linkHost(url)}${path}`.slice(0, 120)
  } catch {
    return url
  }
}

export interface CaptureSource {
  text?: string
  linkUrl?: string
  pageUrl?: string
  pageTitle?: string
  favIconUrl?: string
}

/** Turns a context-menu or shortcut capture into a draft title and attached link. */
export function draftFromCapture(source: CaptureSource): { title: string; link: TaskLink | null } {
  const text = source.text?.replace(/\s+/g, ' ').trim().slice(0, 500) ?? ''
  if (source.linkUrl) {
    return { title: text || prettyUrl(source.linkUrl), link: { url: source.linkUrl, title: text } }
  }
  const pageLink: TaskLink | null = source.pageUrl
    ? {
        url: source.pageUrl,
        title: source.pageTitle ?? '',
        ...(source.favIconUrl ? { favIconUrl: source.favIconUrl } : {}),
      }
    : null
  if (text) return { title: text, link: pageLink }
  return {
    title: source.pageTitle?.trim() || (source.pageUrl ? prettyUrl(source.pageUrl) : ''),
    link: pageLink,
  }
}

// ── Export & import ───────────────────────────────────────────────────────────

const BACKUP_APP = 'one-panel-tasks'

export function tasksToBackup(data: TasksData, now = Date.now()): string {
  return JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: new Date(now).toISOString(), ...data }, null, 2)
}

export function parseTasksBackup(text: string): TasksData {
  const raw = JSON.parse(text) as unknown
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as TasksData).tasks)) {
    throw new Error('Not a tasks backup')
  }
  return normalizeTasksData(raw)
}

/** Imported items replace ones with the same id and are otherwise added. */
export function mergeTasksData(current: TasksData, incoming: TasksData): TasksData {
  const projects = new Map(current.projects.map((p) => [p.id, p]))
  for (const project of incoming.projects) projects.set(project.id, project)
  const tasks = new Map(current.tasks.map((t) => [t.id, t]))
  for (const task of incoming.tasks) tasks.set(task.id, task)
  return normalizeTasksData({ projects: [...projects.values()], tasks: [...tasks.values()] })
}

export function sectionsToMarkdown(
  heading: string,
  sections: Array<{ title: string; tasks: Task[] }>,
  now: number,
  words: DayWords,
): string {
  const lines = [`# ${heading}`, '']
  for (const section of sections) {
    if (!section.tasks.length) continue
    lines.push(`## ${section.title}`, '')
    for (const task of section.tasks) {
      const meta = [
        task.due != null ? formatDue(task.due, task.allDay, now, words) : '',
        task.priority < 4 ? `p${task.priority}` : '',
        ...task.labels.map((l) => `@${l}`),
      ].filter(Boolean)
      const title = task.link ? `[${task.title}](${task.link.url})` : task.title
      lines.push(`- [${task.completed ? 'x' : ' '}] ${title}${meta.length ? ` — ${meta.join(' · ')}` : ''}`)
      for (const sub of task.subtasks) lines.push(`  - [${sub.done ? 'x' : ' '}] ${sub.title}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}
