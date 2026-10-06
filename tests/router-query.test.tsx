import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RouterProvider, useRouter } from '@/app/router'

describe('hash router query strings', () => {
  it('keeps query parameters separate from the route path', () => {
    window.location.hash = '#/tools/text/formatter?format=json'

    function RouterLocation() {
      const { path, search } = useRouter()
      return <span>{`${path}${search}`}</span>
    }

    render(
      <RouterProvider>
        <RouterLocation />
      </RouterProvider>,
    )

    expect(screen.getByText('/tools/text/formatter?format=json')).toBeInTheDocument()
    window.location.hash = '#/'
  })
})