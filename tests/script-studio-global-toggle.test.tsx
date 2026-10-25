import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getScriptStudioIndex } from '@/core/script-studio'
import { useScriptStudio } from '@/tools/sites/script-studio/hooks/useScriptStudio'

describe('Script Studio global switch', () => {
  it('turns every script off and back on', async () => {
    const { result } = renderHook(() => useScriptStudio())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.index?.globalEnabled).toBe(true)

    await act(() => result.current.setGlobalEnabled(false))
    expect(result.current.index?.globalEnabled).toBe(false)
    expect((await getScriptStudioIndex()).globalEnabled).toBe(false)

    await act(() => result.current.setGlobalEnabled(true))
    expect((await getScriptStudioIndex()).globalEnabled).toBe(true)
  })
})
