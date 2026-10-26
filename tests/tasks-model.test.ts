import { describe, expect, it } from 'vitest'

import {
  INBOX_ID,
  REMINDER_STALE_MS,
  SNOOZE_MINUTES,
  completeTask,
  createSubtask,
  createTask,
  nextOccurrence,
  normalizeTasksData,
  planReminders,
  reminderTime,
  samePage,
  snoozeReminder,
  taskIdFromNotificationId,
  taskNotificationId,
} from '@/core/tasks/model'
import {
  buildSections,
  draftFromCapture,
  mergeTasksData,
  parseTasksBackup,
  parseView,
  quickDueDay,
  removeTokens,
  sortTasks,
  tasksToBackup,
  viewCounts,
  viewProgress,
} from '@/tools/productivity/tasks/logic'
import { parseQuickAdd } from '@/core/tasks/parse'

/** Wednesday 21 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 21, 10, 0).getTime()
const at = (month: number, day: number, hours = 0, minutes = 0, year = 2026) =>
  new Date(year, month, day, hours, minutes).getTime()
const MIN = 60_000

describe('recurrence', () => {
  it('always lands in the future', () => {
    expect(nextOccurrence(at(9, 18), true, 'daily', NOW)).toBe(at(9, 22))
    expect(nextOccurrence(at(9, 21, 9), false, 'daily', NOW)).toBe(at(9, 22, 9))
    expect(nextOccurrence(at(9, 21, 12), false, 'daily', NOW)).toBe(at(9, 22, 12))
  })

  it('skips weekends for weekday repeats and clamps month ends', () => {
    const friday = new Date(2026, 9, 23, 10).getTime()
    expect(nextOccurrence(at(9, 23), true, 'weekdays', friday)).toBe(at(9, 26))
    expect(nextOccurrence(at(0, 31, 0, 0, 2027), true, 'monthly', at(0, 31, 8, 0, 2027))).toBe(at(1, 28, 0, 0, 2027))
    expect(nextOccurrence(at(9, 21), true, 'none', NOW)).toBeNull()
  })

  it('rolls repeating tasks forward and resets their subtasks', () => {
    const task = createTask(
      { title: 'Water plants', due: at(9, 21), allDay: true, recurrence: 'weekly', subtasks: [{ ...createSubtask('Fern'), done: true }] },
      NOW,
    )
    const result = completeTask(task, NOW)
    expect(result.rolledTo).toBe(at(9, 28))
    expect(result.task).toMatchObject({ completed: false, due: at(9, 28) })
    expect(result.task.subtasks.every((s) => !s.done)).toBe(true)
  })

  it('completes one-off tasks', () => {
    const result = completeTask(createTask({ title: 'Ship it' }, NOW), NOW + 5)
    expect(result).toMatchObject({ rolledTo: null, task: { completed: true, completedAt: NOW + 5 } })
  })
})

describe('createTask defaults', () => {
  it('reminds at the due time for timed tasks only, unless told otherwise', () => {
    expect(createTask({ title: 'a', due: at(9, 22, 9), allDay: false }, NOW).reminder).toBe(0)
    expect(createTask({ title: 'b', due: at(9, 22), allDay: true }, NOW).reminder).toBeNull()
    expect(createTask({ title: 'c', due: at(9, 22, 9), allDay: false, reminder: null }, NOW).reminder).toBeNull()
    expect(createTask({ title: 'd', due: at(9, 22), allDay: true, reminder: 15 }, NOW).reminder).toBe(15)
  })
})

describe('planReminders', () => {
  const timed = (due: number, updatedAt = NOW - 60 * MIN) => ({
    ...createTask({ title: 'Call', due, allDay: false }, updatedAt),
    updatedAt,
  })

  it('wakes up for the next reminder and notifies once it passes', () => {
    const task = timed(NOW + 5 * MIN)
    const before = planReminders([task], {}, NOW)
    expect(before).toMatchObject({ notify: [], nextAt: NOW + 5 * MIN, changed: false })

    const due = planReminders([task], before.log, NOW + 5 * MIN + 1000)
    expect(due.notify.map((t) => t.id)).toEqual([task.id])
    expect(due.changed).toBe(true)

    const again = planReminders([task], due.log, NOW + 6 * MIN)
    expect(again).toMatchObject({ notify: [], changed: false })
  })

  it('stays quiet for stale reminders and for ones already past when the task was saved', () => {
    const stale = timed(NOW - REMINDER_STALE_MS - MIN, NOW - REMINDER_STALE_MS - 2 * MIN)
    const savedLate = timed(NOW - 30 * MIN, NOW - 5 * MIN)
    const plan = planReminders([stale, savedLate], {}, NOW)
    expect(plan.notify).toEqual([])
    expect(Object.keys(plan.log).sort()).toEqual([stale.id, savedLate.id].sort())
  })

  it('reminds all-day tasks in the morning and re-notifies after a snooze', () => {
    const allDay = { ...createTask({ title: 'Plan', due: at(9, 21), allDay: true, reminder: 0 }, at(9, 20)), updatedAt: at(9, 20) }
    expect(reminderTime(allDay)).toBe(at(9, 21, 9))
    const first = planReminders([allDay], {}, at(9, 21, 9, 1))
    expect(first.notify).toHaveLength(1)

    const snoozed = snoozeReminder(first.log, allDay, at(9, 21, 9, 2))
    const waiting = planReminders([allDay], snoozed, at(9, 21, 9, 5))
    expect(waiting).toMatchObject({ notify: [], nextAt: at(9, 21, 9, 2) + SNOOZE_MINUTES * MIN })
    const back = planReminders([allDay], waiting.log, at(9, 21, 9, 13))
    expect(back.notify).toHaveLength(1)
    expect(back.log[allDay.id].snoozeUntil).toBeUndefined()
  })

  it('forgets completed and removed tasks', () => {
    const task = timed(NOW - MIN, NOW - 2 * MIN)
    const plan = planReminders([task], {}, NOW)
    const done = planReminders([{ ...task, completed: true }], plan.log, NOW + MIN)
    expect(done).toMatchObject({ log: {}, changed: true, notify: [] })
  })
})

describe('normalization and helpers', () => {
  it('repairs stored data and reassigns orphaned projects to the inbox', () => {
    const data = normalizeTasksData({
      projects: [{ id: 'p1', name: 'Work', color: 'nope' }],
      tasks: [
        { id: 't1', title: '  Keep  ', projectId: 'missing', priority: 9, labels: ['@a', 'a', ''] },
        { title: '' },
        'junk',
      ],
    })
    expect(data.projects).toMatchObject([{ id: 'p1', name: 'Work', color: 'blue' }])
    expect(data.tasks).toHaveLength(2)
    expect(data.tasks[0]).toMatchObject({ id: 't1', projectId: INBOX_ID, priority: 4, labels: ['a'] })
  })

  it('round-trips notification ids and compares pages loosely', () => {
    expect(taskIdFromNotificationId(taskNotificationId('abc'))).toBe('abc')
    expect(taskIdFromNotificationId('other:abc')).toBeNull()
    expect(samePage('https://a.com/x/#top', 'https://a.com/x')).toBe(true)
    expect(samePage('https://a.com/x?q=1', 'https://a.com/x')).toBe(false)
  })
})

describe('tasks view logic', () => {
  const make = (title: string, partial: Parameters<typeof createTask>[0] = {}) =>
    createTask({ title, ...partial }, NOW - 1000)

  it('groups Today into overdue and today, and Upcoming by day', () => {
    const overdue = make('Old', { due: at(9, 19), allDay: true })
    const morning = make('Morning call', { due: at(9, 21, 9), allDay: false })
    const today = make('Today any time', { due: at(9, 21), allDay: true, priority: 1 })
    const friday = make('Friday', { due: at(9, 23), allDay: true })
    const far = make('Far', { due: at(11, 1), allDay: true })
    const tasks = [far, friday, today, morning, overdue]

    const todaySections = buildSections({ kind: 'today' }, tasks, [], NOW, 'smart')
    expect(todaySections.map((s) => [s.kind, s.tasks.map((t) => t.title)])).toEqual([
      ['overdue', ['Old', 'Morning call']],
      ['day', ['Today any time']],
    ])

    const upcoming = buildSections({ kind: 'upcoming' }, tasks, [], NOW, 'smart')
    expect(upcoming.map((s) => s.kind)).toEqual(['overdue', 'day', 'day', 'later'])
    expect(upcoming.at(-1)?.tasks.map((t) => t.title)).toEqual(['Far'])
  })

  it('sorts timed tasks before all-day ones within a day', () => {
    const allDay = make('All day', { due: at(9, 22), allDay: true, priority: 1 })
    const timed = make('Timed', { due: at(9, 22, 15), allDay: false, priority: 4 })
    expect(sortTasks([allDay, timed], 'smart').map((t) => t.title)).toEqual(['Timed', 'All day'])
    expect(sortTasks([timed, allDay], 'priority').map((t) => t.title)).toEqual(['All day', 'Timed'])
  })

  it('searches across titles, links, labels and projects', () => {
    const tasks = [
      make('Read docs', { link: { url: 'https://react.dev/learn', title: 'Learn React' }, labels: ['reading'] }),
      make('Buy milk', { projectId: 'p1' }),
    ]
    const projects = [{ id: 'p1', name: 'Home', color: 'green' as const, createdAt: 0 }]
    const search = (q: string) =>
      buildSections({ kind: 'today' }, tasks, projects, NOW, 'smart', q).flatMap((s) => s.tasks.map((t) => t.title))
    expect(search('react')).toEqual(['Read docs'])
    expect(search('@reading')).toEqual(['Read docs'])
    expect(search('#home milk')).toEqual(['Buy milk'])
  })

  it('counts views and progress', () => {
    const done = { ...make('Done', { due: at(9, 21), allDay: true }), completed: true, completedAt: NOW - 10 }
    const open = make('Open', { due: at(9, 21), allDay: true, labels: ['Deep'] })
    const inbox = make('Someday')
    const counts = viewCounts([done, open, inbox], NOW)
    expect(counts).toMatchObject({ today: 1, overdue: 0, inbox: 2, labels: { deep: 1 } })
    expect(viewProgress({ kind: 'today' }, [done, open, inbox], NOW)).toEqual({ done: 1, total: 2 })
    expect(parseView('project:missing', { tasks: [], projects: [] })).toEqual({ kind: 'today' })
  })

  it('offers quick dates relative to today', () => {
    expect(quickDueDay('today', NOW)).toBe(at(9, 21))
    expect(quickDueDay('tomorrow', NOW)).toBe(at(9, 22))
    expect(quickDueDay('weekend', NOW)).toBe(at(9, 24))
    expect(quickDueDay('nextWeek', NOW)).toBe(at(9, 26))
  })

  it('turns captures into drafts', () => {
    expect(draftFromCapture({ pageUrl: 'https://a.com/post', pageTitle: 'A post', favIconUrl: 'https://a.com/f.ico' })).toEqual({
      title: 'A post',
      link: { url: 'https://a.com/post', title: 'A post', favIconUrl: 'https://a.com/f.ico' },
    })
    expect(draftFromCapture({ linkUrl: 'https://b.com/x', text: '  Read  this ' })).toEqual({
      title: 'Read this',
      link: { url: 'https://b.com/x', title: 'Read this' },
    })
    expect(draftFromCapture({ text: 'Quote', pageUrl: 'https://c.com' }).link?.url).toBe('https://c.com')
  })

  it('removes recognised tokens of chosen kinds from the text', () => {
    const text = 'Call Ana tomorrow 5pm p1'
    const { tokens } = parseQuickAdd(text, { now: NOW })
    expect(removeTokens(text, tokens, ['date'])).toBe('Call Ana p1')
    expect(removeTokens(text, tokens, ['priority'])).toBe('Call Ana tomorrow 5pm ')
  })

  it('round-trips backups and merges by id', () => {
    const a = make('A')
    const b = make('B')
    const backup = parseTasksBackup(tasksToBackup({ tasks: [a], projects: [] }, NOW))
    expect(backup.tasks[0].id).toBe(a.id)
    const merged = mergeTasksData({ tasks: [{ ...a, title: 'Old A' }, b], projects: [] }, backup)
    expect(merged.tasks.map((t) => t.title).sort()).toEqual(['A', 'B'])
    expect(() => parseTasksBackup('{"notes":[]}')).toThrow()
  })
})
