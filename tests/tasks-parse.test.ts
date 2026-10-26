import { describe, expect, it } from 'vitest'

import { parseDueText, parseQuickAdd } from '@/core/tasks/parse'

/** Wednesday 21 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 21, 10, 0).getTime()
const at = (month: number, day: number, hours = 0, minutes = 0, year = 2026) =>
  new Date(year, month, day, hours, minutes).getTime()

const parse = (input: string, options: Parameters<typeof parseQuickAdd>[1] = {}) =>
  parseQuickAdd(input, { now: NOW, dayFirst: false, ...options })

describe('parseQuickAdd dates and times', () => {
  it('reads a relative day with a 12-hour time', () => {
    const result = parse('Buy milk tomorrow 5pm')
    expect(result.title).toBe('Buy milk')
    expect(result.due).toBe(at(9, 22, 17))
    expect(result.allDay).toBe(false)
  })

  it('treats a bare day as all-day', () => {
    const result = parse('Call mom today')
    expect(result).toMatchObject({ title: 'Call mom', due: at(9, 21), allDay: true, recurrence: null })
  })

  it('accepts "yesterday" for tasks that are already late', () => {
    expect(parse('Pay rent yesterday p1')).toMatchObject({ title: 'Pay rent', due: at(9, 20), priority: 1 })
  })

  it('reads "next <weekday>" as the one after the coming one', () => {
    expect(parse('Report next fri').due).toBe(at(9, 30))
    expect(parse('Report fri').due).toBe(at(9, 23))
  })

  it('only reads "sat"/"sun" as days with a lead-in word', () => {
    expect(parse('Call sun').due).toBeNull()
    expect(parse('Brunch on sun').due).toBe(at(9, 25))
  })

  it('handles weekends, tonight, noon and parts of the day', () => {
    expect(parse('Plan trip this weekend')).toMatchObject({ title: 'Plan trip', due: at(9, 24), allDay: true })
    expect(parse('Movie tonight')).toMatchObject({ title: 'Movie', due: at(9, 21, 20), allDay: false })
    expect(parse('Lunch at noon')).toMatchObject({ title: 'Lunch', due: at(9, 21, 12) })
    expect(parse('Fix bug tomorrow morning')).toMatchObject({ title: 'Fix bug', due: at(9, 22, 9) })
  })

  it('moves a time that already passed today to tomorrow', () => {
    expect(parse('Run 7am')).toMatchObject({ title: 'Run', due: at(9, 22, 7), allDay: false })
  })

  it('reads relative offsets', () => {
    expect(parse('Check oven in 20 min').due).toBe(NOW + 20 * 60_000)
    expect(parse('Follow up in 2 hours')).toMatchObject({ title: 'Follow up', due: NOW + 2 * 3_600_000, allDay: false })
    expect(parse('Renew in 3 days')).toMatchObject({ due: at(9, 24), allDay: true })
  })

  it('reads month names, ISO dates and times together', () => {
    expect(parse('Dentist Oct 30 at 3pm')).toMatchObject({ title: 'Dentist', due: at(9, 30, 15) })
    expect(parse('Party 5th of December').due).toBe(at(11, 5))
    expect(parse('Sync 2026-11-05').due).toBe(at(10, 5))
    expect(parse('Old event Jan 3').due).toBe(at(0, 3, 0, 0, 2027))
  })

  it('needs a lead-in or a year for numeric dates and follows the day order', () => {
    expect(parse('Ratio 1/11').due).toBeNull()
    expect(parse('Pay rent on 1/11').due).toBe(at(0, 11, 0, 0, 2027))
    expect(parse('Pay rent on 1/11', { dayFirst: true }).due).toBe(at(10, 1))
  })

  it('does not mistake ordinary phrases for times', () => {
    expect(parse('Take 2 a day').due).toBeNull()
    expect(parse('Take 2 a day').title).toBe('Take 2 a day')
    expect(parse('Morning pages').due).toBeNull()
  })
})

describe('parseQuickAdd repeats', () => {
  it('reads "every <weekday>" starting with the next such day', () => {
    expect(parse('Review every monday')).toMatchObject({ title: 'Review', recurrence: 'weekly', due: at(9, 26) })
    expect(parse('Gym every wednesday').due).toBe(at(9, 21))
  })

  it('starts a timed repeat at its next occurrence when today\'s time has passed', () => {
    expect(parse('Standup every weekday 9:30')).toMatchObject({
      title: 'Standup',
      recurrence: 'weekdays',
      due: at(9, 22, 9, 30),
      allDay: false,
    })
    expect(parse('Water plants every day')).toMatchObject({ recurrence: 'daily', due: at(9, 21), allDay: true })
  })

  it('leaves bare frequency words in the title', () => {
    expect(parse('Daily standup notes')).toMatchObject({ title: 'Daily standup notes', recurrence: null })
  })
})

describe('parseQuickAdd priority, project and labels', () => {
  it('extracts every token and reports positions', () => {
    const result = parse('Report next fri p1 #Work @urgent @Urgent')
    expect(result).toMatchObject({ title: 'Report', priority: 1, project: 'Work', labels: ['urgent'] })
    const email = parse('Email @bob p2')
    expect(email.tokens.map((token) => [token.kind, token.start, token.end])).toEqual([
      ['label', 6, 10],
      ['priority', 11, 13],
    ])
  })

  it('supports Unicode labels and leaves unknown words alone', () => {
    expect(parse('Revoir @leçons').labels).toEqual(['leçons'])
    expect(parse('Email bob@example.com').labels).toEqual([])
    expect(parse('Issue #42 fix')).toMatchObject({ project: null, title: 'Issue #42 fix' })
  })

  it('skips ignored kinds', () => {
    const result = parse('Meet tomorrow p1', { ignore: ['date'] })
    expect(result).toMatchObject({ title: 'Meet tomorrow', due: null, priority: 1 })
  })
})

describe('parseDueText', () => {
  it('reads date-only input including repeats', () => {
    expect(parseDueText('every monday', NOW)).toEqual({ due: at(9, 26), allDay: true, recurrence: 'weekly' })
    expect(parseDueText('fri 5pm', NOW)).toEqual({ due: at(9, 23, 17), allDay: false, recurrence: null })
    expect(parseDueText('#Work p1', NOW)).toBeNull()
  })
})
