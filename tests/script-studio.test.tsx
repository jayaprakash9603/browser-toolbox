import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LibraryView } from '@/tools/sites/script-studio/components/LibraryView'

describe('Script Studio LibraryView', () => {
  it('renders script name', () => {
    render(
      <LibraryView
        scripts={[
          {
            id: '1',
            uuid: '1',
            enabled: true,
            trashed: false,
            position: 0,
            createdAt: 0,
            updatedAt: 0,
            overrides: {},
            size: 100,
            name: 'Hello Script',
            version: '1.0',
          },
        ]}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onTrash={vi.fn()}
        onBulkEnable={vi.fn()}
        onCheckUpdates={vi.fn()}
        loadCode={async () => ''}
      />,
    )
    expect(screen.getAllByText('Hello Script').length).toBeGreaterThan(0)
  })
})
