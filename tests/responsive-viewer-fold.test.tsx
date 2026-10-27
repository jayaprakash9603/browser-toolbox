import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { ControlsFoldToggle } from '@/tools/design/responsive-viewer/ControlsFold'
import { useControlsFold } from '@/tools/design/responsive-viewer/useControlsFold'

function Harness() {
  const [folded, setFolded] = useControlsFold()
  return (
    <TooltipProvider>
      <ControlsFoldToggle
        folded={folded}
        controlsId="rv-controls"
        count={3}
        zoomLabel="75%"
        onToggle={() => setFolded(!folded)}
      />
      {!folded && <div id="rv-controls">controls</div>}
    </TooltipProvider>
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('responsive viewer controls fold', () => {
  it('folds the controls into a summary pill and remembers the choice', () => {
    render(<Harness />)
    const toggle = screen.getByRole('button', { name: /device and view controls/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'rv-controls')
    expect(screen.getByText('controls')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleName(/3 devices · 75%/)
    expect(screen.queryByText('controls')).not.toBeInTheDocument()

    cleanup()
    render(<Harness />)
    expect(screen.getByRole('button', { name: /device and view controls/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('uses the singular summary for one device', () => {
    localStorage.setItem('tbx.rv.controlsFolded', '1')
    render(
      <TooltipProvider>
        <ControlsFoldToggle folded controlsId="x" count={1} zoomLabel="Fit" onToggle={() => {}} />
      </TooltipProvider>,
    )
    expect(screen.getByRole('button')).toHaveAccessibleName(/1 device · Fit/)
  })
})
