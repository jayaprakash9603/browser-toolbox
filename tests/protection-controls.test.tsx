import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@/app/router'
import { getAdblockState, updateAdblockState } from '@/core/adblock'
import { getProtectionState, updateProtectionState } from '@/core/protection'
import { AdblockHeaderToggle, ProtectionHeaderToggle } from '@/features/header/HeaderToggles'
import { ProtectionPowerCard } from '@/features/protection/components/ProtectionPowerCard'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { registerModules } from '@/modules'
import { resetChromeMockStorage } from './setup'

registerModules()

beforeEach(() => {
  resetChromeMockStorage()
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderHeader(type: 'adblock' | 'protection') {
  window.location.hash = '#/'
  return render(
    <TooltipProvider>
      <RouterProvider>
        {type === 'adblock' ? <AdblockHeaderToggle /> : <ProtectionHeaderToggle />}
      </RouterProvider>
    </TooltipProvider>,
  )
}

describe('header protection panels', () => {
  it('opens Ad Blocker settings without changing protection and explicitly toggles and persists options', async () => {
    vi.spyOn(chrome.permissions, 'contains').mockImplementation(async () => true)
    renderHeader('adblock')
    const trigger = await screen.findByRole('button', { name: 'Ad Blocker: off' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Ad Blocker' })
    expect((await getAdblockState()).enabled).toBe(false)
    const power = within(dialog).getByRole('switch', { name: 'Ad Blocker' })
    fireEvent.click(power)
    await waitFor(() => expect(power).toHaveAttribute('aria-checked', 'true'))
    expect((await getAdblockState()).enabled).toBe(true)
    const options = within(dialog)
      .getAllByRole('switch')
      .filter((control) => control !== power)
    expect(options.length).toBeGreaterThan(4)
    const ads = options[0]
    fireEvent.click(ads)
    await waitFor(() => expect(ads).toHaveAttribute('aria-checked', 'false'))
    expect((await getAdblockState()).lists.ads).toBe(false)
    fireEvent.click(power)
    await waitFor(() => expect(power).toHaveAttribute('aria-checked', 'false'))
    expect((await getAdblockState()).lists.ads).toBe(false)
    expect(within(dialog).getByRole('link', { name: /Open all/ })).toHaveAttribute(
      'href',
      '#/tools/privacy/ad-blocker',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close protection controls' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('uses the same Web Protection panel and updates a guard without affecting Ad Blocker', async () => {
    vi.spyOn(chrome.permissions, 'contains').mockImplementation(async () => true)
    await updateProtectionState({ enabled: true })
    renderHeader('protection')
    fireEvent.click(await screen.findByRole('button', { name: 'Web Protection: on' }))
    const dialog = await screen.findByRole('dialog', { name: 'Web Protection' })
    const power = within(dialog).getByRole('switch', { name: 'Web Protection' })
    const options = within(dialog)
      .getAllByRole('switch')
      .filter((control) => control !== power)
    expect(options).toHaveLength(10)
    fireEvent.click(options[0])
    await waitFor(() => expect(options[0]).toHaveAttribute('aria-checked', 'false'))
    expect((await getProtectionState()).phishing).toBe(false)
    fireEvent.click(power)
    await waitFor(() => expect(power).toHaveAttribute('aria-checked', 'false'))
    expect((await getAdblockState()).enabled).toBe(false)
  })

  it('keeps protection off and explains when site access is declined', async () => {
    vi.spyOn(chrome.permissions, 'contains').mockImplementation(async () => false)
    vi.spyOn(chrome.permissions, 'request').mockImplementation(async () => false)
    renderHeader('adblock')
    fireEvent.click(await screen.findByRole('button', { name: 'Ad Blocker: off' }))
    fireEvent.click(await screen.findByRole('switch', { name: 'Ad Blocker' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Site access may not have been granted',
    )
    expect((await getAdblockState()).enabled).toBe(false)
  })

  it('surfaces option save failures instead of claiming success', async () => {
    vi.spyOn(chrome.permissions, 'contains').mockImplementation(async () => true)
    await updateAdblockState({ enabled: true })
    renderHeader('adblock')
    fireEvent.click(await screen.findByRole('button', { name: 'Ad Blocker: on' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ad Blocker' })
    const failure = vi
      .spyOn(chrome.storage.local, 'set')
      .mockRejectedValue(new Error('Storage unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fireEvent.click(within(dialog).getAllByRole('switch')[1])
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save Ad Blocker settings')
    expect(log).toHaveBeenCalled()
    failure.mockRestore()
    expect((await getAdblockState()).lists.ads).toBe(true)
  })
})

describe('shared protection power control', () => {
  it('prevents duplicate updates while pending and exposes errors', async () => {
    let rejectSave: (reason: Error) => void = () => undefined
    const save = vi.fn(
      () =>
        new Promise<boolean>((_resolve, reject) => {
          rejectSave = reject
        }),
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<ProtectionPowerCard name="Web Protection" enabled={false} onToggle={save} />)
    const control = screen.getByRole('switch', { name: 'Web Protection' })
    fireEvent.click(control)
    expect(control).toBeDisabled()
    fireEvent.click(control)
    expect(save).toHaveBeenCalledTimes(1)
    rejectSave(new Error('Save failed'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save Web Protection settings',
    )
    expect(log).toHaveBeenCalled()
    expect(control).not.toBeDisabled()
    expect(control).toHaveAttribute('aria-checked', 'false')
  })
})
