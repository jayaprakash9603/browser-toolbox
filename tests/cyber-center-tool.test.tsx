import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { RouterProvider } from '@/app/router'
import { SECURITY_CENTER_TABS } from '@/core/security-center'
import { securityCenterStrings } from '@/i18n/locales/securityCenterEn'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import CyberSecurityCenterTool from '@/tools/security/cyber-center/Tool'
import { resetChromeMockStorage } from './setup'

registerModules()

function tabLabel(id: (typeof SECURITY_CENTER_TABS)[number]) {
  return securityCenterStrings[`securityCenter.tab.${id}` as keyof typeof securityCenterStrings]
}

function renderTool() {
  window.location.hash = '#/tools/security/cyber-center'
  return render(
    <TooltipProvider>
      <RouterProvider>
        <CyberSecurityCenterTool />
      </RouterProvider>
    </TooltipProvider>,
  )
}

describe('Cyber Security Center', { timeout: 20_000 }, () => {
  beforeEach(() => {
    resetChromeMockStorage()
  })

  afterEach(cleanup)

  it('renders sixteen navigable sections and honest overview copy', async () => {
    renderTool()
    expect(await screen.findByRole('heading', { name: 'Cyber Security Center' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(SECURITY_CENTER_TABS.length)
    for (const tab of SECURITY_CENTER_TABS) {
      expect(screen.getByRole('tab', { name: tabLabel(tab) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Scan current website' })).toBeInTheDocument()
    expect(screen.getByText(/Certificate details are not available/i)).toBeInTheDocument()
    expect(screen.getByText(/none recorded/i)).toBeInTheDocument()
  })

  it('maps protection modules onto existing engines and can pause shields', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('tab', { name: tabLabel('protection') }))
    expect(await screen.findByText('Pause all (5m)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Balanced' })).toBeInTheDocument()
    expect(screen.getByText('Malicious sites')).toBeInTheDocument()
    expect(screen.getByText(/not an eval sandbox/i)).toBeInTheDocument()
  })

  it('keeps cookie values behind optional permission', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('tab', { name: tabLabel('cookies') }))
    expect(await screen.findByText(/Metadata only\. Values are hidden and never exported/i)).toBeInTheDocument()
    expect(screen.queryByText(/SECRET-VALUE|cookie value/i)).not.toBeInTheDocument()
  })

  it('leaves breach lookup unconfigured and stores keys with a vault disclaimer', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('tab', { name: tabLabel('data-breaches') }))
    expect(await screen.findByText(/No provider configured/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: tabLabel('settings') }))
    expect(await screen.findByText(/not a hardware-backed secrets vault/i)).toBeInTheDocument()
  })
})
