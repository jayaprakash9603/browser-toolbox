import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_FORM_MEMORY_STATE, type FormMemoryState } from '@/core/form-memory/model'
import { applyReviewCapture } from '@/core/form-memory/review'
import { ToastProvider } from '@/shared/components/toast/ToastProvider'
import { ReviewView } from '@/tools/productivity/form-autofill/ReviewView'

const MINUTE = 60_000

function reviewState(): FormMemoryState {
  const field = { key: 'text:name', label: 'Name', kind: 'text' as const, name: 'name' }
  let state = applyReviewCapture(
    DEFAULT_FORM_MEMORY_STATE,
    { url: 'https://a.test/form', title: 'Sign up', fields: [{ ...field, value: 'jayaprakash' }] },
    0,
  )
  state = applyReviewCapture(
    state,
    { url: 'https://a.test/form', title: 'Sign up', fields: [{ ...field, value: 'first_name' }] },
    10 * MINUTE,
  )
  return state
}

function renderView(state: FormMemoryState) {
  let current = state
  const update = vi.fn(async (mutate: (value: FormMemoryState) => FormMemoryState) => {
    current = mutate(current)
    return current
  })
  render(
    <ToastProvider>
      <ReviewView state={state} update={update} currentUrl="https://a.test/form?x=1" />
    </ToastProvider>,
  )
  return { update, result: () => current }
}

describe('form autofill review view', () => {
  it('lists every value entered for a field and saves the picked one globally', () => {
    const { update, result } = renderView(reviewState())

    expect(screen.getByText('a.test')).toBeInTheDocument()
    expect(screen.getByText('first_name')).toBeInTheDocument()
    expect(screen.getByText('jayaprakash')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /jayaprakash/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Make global' }))

    expect(update).toHaveBeenCalledTimes(1)
    expect(Object.values(result().global).map((field) => field.value)).toEqual(['jayaprakash'])
    expect(result().review).toEqual({})
  })

  it('shows an empty state when nothing waits for review', () => {
    renderView(DEFAULT_FORM_MEMORY_STATE)
    expect(screen.getByText('Nothing to review')).toBeInTheDocument()
  })
})
