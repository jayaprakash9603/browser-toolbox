import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FORM_MEMORY_STATE,
  normalizeFormMemoryState,
  planFill,
  reviewIdFor,
  setHostBlocked,
  type CapturedField,
  type FormMemoryState,
} from '@/core/form-memory/model'
import {
  approveAllReview,
  approveReview,
  dismissReview,
  dismissReviewValue,
  groupReviewByHost,
  pageReviewCount,
  resolvePageReview,
  restoreReview,
  applyReviewCapture,
} from '@/core/form-memory/review'

const URL_A = 'https://a.test/form'
const PAGE_A = 'https://a.test/form'
const name = (value: string): CapturedField => ({ key: 'text:name', label: 'Name', kind: 'text', value, name: 'name' })
const ID = reviewIdFor(PAGE_A, 'text:name')
const MINUTE = 60_000

function capture(state: FormMemoryState, value: string, at: number, url = URL_A): FormMemoryState {
  return applyReviewCapture(state, { url, title: 'Form', fields: [name(value)] }, at)
}

describe('form memory review', () => {
  it('queues captures for review instead of saving them', () => {
    const state = capture(DEFAULT_FORM_MEMORY_STATE, 'jayaprakash', 1)
    expect(state.pages).toEqual({})
    expect(state.review[ID].values.map((item) => item.value)).toEqual(['jayaprakash'])
    expect(pageReviewCount(state, PAGE_A)).toBe(1)
  })

  it('collapses keystrokes of one edit and keeps separate answers with how often they were entered', () => {
    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'jaya', 0)
    state = capture(state, 'jayaprakash', 2_000)
    expect(state.review[ID].values.map((item) => item.value)).toEqual(['jayaprakash'])

    state = capture(state, 'first_name', 10 * MINUTE)
    state = capture(state, 'jayaprakash', 20 * MINUTE)
    expect(state.review[ID].values.map((item) => [item.value, item.count])).toEqual([
      ['jayaprakash', 2],
      ['first_name', 1],
    ])

    expect(capture(state, 'jayaprakash', 20 * MINUTE + 500)).toBe(state)
  })

  it('takes back only the in-progress count when an answer entered before is edited', () => {
    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'ada', 0)
    state = capture(state, 'ada', 10 * MINUTE)
    state = capture(state, 'ada l', 10 * MINUTE + 1_000)
    expect(state.review[ID].values.map((item) => [item.value, item.count])).toEqual([
      ['ada l', 1],
      ['ada', 1],
    ])
  })

  it('saves the picked value for the page and skips it once approved', () => {
    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'jayaprakash', 0)
    state = capture(state, 'first_name', 10 * MINUTE)
    state = approveReview(state, ID, 1, 'page', 11 * MINUTE)
    expect(state.review[ID]).toBeUndefined()
    expect(state.pages[PAGE_A].fields['text:name'].value).toBe('jayaprakash')
    expect(capture(state, 'jayaprakash', 30 * MINUTE)).toBe(state)
  })

  it('makes a value global so matching fields on other sites are planned with it', () => {
    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'Ada', 0)
    state = approveReview(state, ID, 0, 'global', 1)
    expect(Object.values(state.global).map((field) => field.value)).toEqual(['Ada'])

    const plan = planFill(state, 'https://b.test/signup', false)
    expect(plan.global.map((field) => field.value)).toEqual(['Ada'])
    expect(plan.shared).toEqual([])
    expect(capture(state, 'Ada', 10 * MINUTE, 'https://b.test/signup')).toBe(state)
  })

  it('dismisses single values or whole entries, with restore for undo', () => {
    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'one', 0)
    state = capture(state, 'two', 10 * MINUTE)
    state = dismissReviewValue(state, ID, 0)
    expect(state.review[ID].values.map((item) => item.value)).toEqual(['one'])

    const entry = state.review[ID]
    state = dismissReview(state, [ID])
    expect(state.review).toEqual({})
    expect(restoreReview(state, [entry]).review[ID]).toEqual(entry)
  })

  it('approves everything at once and resolves a page after an explicit save', () => {
    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'Ada', 0)
    state = capture(state, 'Grace', 0, 'https://b.test/signup')
    expect(groupReviewByHost(state).map((group) => group.host).sort()).toEqual(['a.test', 'b.test'])

    const approved = approveAllReview(state, 'page', 5)
    expect(approved.review).toEqual({})
    expect(Object.keys(approved.pages).sort()).toEqual([PAGE_A, 'https://b.test/signup'])

    expect(Object.keys(resolvePageReview(state, PAGE_A).review)).toEqual([reviewIdFor('https://b.test/signup', 'text:name')])
  })

  it('ignores blocked hosts and keeps review and global values across storage', () => {
    const blocked = setHostBlocked(DEFAULT_FORM_MEMORY_STATE, 'a.test', true)
    expect(capture(blocked, 'Ada', 0)).toBe(blocked)

    let state = capture(DEFAULT_FORM_MEMORY_STATE, 'Ada', 0)
    state = capture(state, 'Grace', 10 * MINUTE, 'https://b.test/signup')
    state = approveReview(state, reviewIdFor('https://b.test/signup', 'text:name'), 0, 'global', 11 * MINUTE)
    const restored = normalizeFormMemoryState(JSON.parse(JSON.stringify(state)))
    expect(restored.review).toEqual(state.review)
    expect(restored.global).toEqual(state.global)
    expect(normalizeFormMemoryState({ review: { x: { url: 'nope' } }, global: { y: 1 } })).toMatchObject({
      review: {},
      global: {},
    })
  })
})
