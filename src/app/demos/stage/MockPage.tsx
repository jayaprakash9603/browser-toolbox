import { cn } from '@/shared/utils/cn'

import { mockImage } from './mockImage'

function Nav({ brand }: { brand: string }) {
  return (
    <div data-d="page-nav" className="flex items-center gap-3 border-b border-black/5 px-4 py-2.5">
      <span
        data-d="page-logo"
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111]"
      >
        <span className="size-3 rounded bg-[#111]" />
        {brand}
      </span>
      <span className="ml-auto flex gap-3 text-[9.5px] text-[#555]">
        <span data-d="page-link">Product</span>
        <span data-d="page-link">Pricing</span>
        <span data-d="page-link">Blog</span>
      </span>
      <span
        data-d="page-cta-nav"
        className="shrink-0 whitespace-nowrap rounded-full bg-[#111] px-2.5 py-1 text-[9px] text-white"
      >
        Sign up
      </span>
    </div>
  )
}

interface MockPageProps {
  variant?: 'landing' | 'shop' | 'article'
  brand?: string
  className?: string
  title?: string
}

/** A light, generic web page for demos that act on the current tab. */
export function MockPage({
  variant = 'landing',
  brand = 'Northwind',
  className,
  title,
}: MockPageProps) {
  return (
    <div data-d="page" className={cn('h-full overflow-hidden bg-[#fafafa] text-[#111]', className)}>
      <Nav brand={brand} />
      {variant === 'landing' ? (
        <div className="px-5 pt-5">
          <p
            data-d="page-eyebrow"
            className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]"
          >
            New release
          </p>
          <h3
            data-d="page-title"
            className="mt-1.5 max-w-[15rem] text-[19px] font-bold leading-[1.1] tracking-tight"
          >
            {title ?? 'Ship faster with a calmer workflow'}
          </h3>
          <p
            data-d="page-sub"
            className="mt-2 max-w-[14rem] text-[9.5px] leading-relaxed text-[#555]"
          >
            Plan, build and launch from one place. Trusted by teams who care about craft.
          </p>
          <div className="mt-3 flex gap-2">
            <span
              data-d="page-cta"
              className="rounded-md bg-[#7c3aed] px-3 py-1.5 text-[9.5px] font-medium text-white"
            >
              Start free
            </span>
            <span
              data-d="page-cta2"
              className="rounded-md border border-black/10 px-3 py-1.5 text-[9.5px] font-medium"
            >
              Book a demo
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                data-d="page-card"
                className="rounded-lg border border-black/5 bg-white p-1.5 shadow-sm"
              >
                <div
                  data-d="page-img"
                  className="h-12 rounded-md"
                  style={{ background: mockImage(index) }}
                />
                <span className="mt-1.5 block h-1.5 w-4/5 rounded-full bg-black/15" />
                <span className="mt-1 block h-1.5 w-1/2 rounded-full bg-black/10" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {variant === 'shop' ? (
        <div className="px-4 pt-3">
          <h3 data-d="page-title" className="text-[14px] font-bold tracking-tight">
            {title ?? 'New arrivals'}
          </h3>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} data-d="page-card" className="rounded-lg bg-white p-1.5 shadow-sm">
                <div
                  data-d="page-img"
                  className="h-14 rounded-md"
                  style={{ background: mockImage(index + 1) }}
                />
                <p data-d="page-name" className="mt-1 truncate text-[8.5px] font-medium">
                  {
                    [
                      'Aero Lamp',
                      'Linen Chair',
                      'Oak Desk',
                      'Glass Vase',
                      'Wool Throw',
                      'Clay Mug',
                    ][index]
                  }
                </p>
                <p data-d="page-price" className="text-[8.5px] text-[#7c3aed]">
                  ${[89, 240, 410, 36, 64, 18][index]}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {variant === 'article' ? (
        <div className="px-5 pt-4">
          <p className="text-[8.5px] uppercase tracking-[0.2em] text-[#7c3aed]">Engineering</p>
          <h3
            data-d="page-title"
            className="mt-1 text-[16px] font-bold leading-tight tracking-tight"
          >
            {title ?? 'How we cut our build times in half'}
          </h3>
          <p className="mt-1 text-[8.5px] text-[#777]">Maya Chen · 6 min read</p>
          <div
            data-d="page-img"
            className="mt-2.5 h-16 rounded-lg"
            style={{ background: mockImage(1) }}
          />
          {[0, 1, 2].map((index) => (
            <p
              key={index}
              data-d="page-para"
              className="mt-2 text-[9px] leading-relaxed text-[#444]"
            >
              {index === 1 ? (
                <>
                  Caching moved to the edge, and{' '}
                  <span data-d="page-link" className="text-[#7c3aed] underline">
                    our CI docs
                  </span>{' '}
                  explain the{' '}
                  <span data-d="page-link" className="text-[#7c3aed] underline">
                    remote cache
                  </span>{' '}
                  setup.
                </>
              ) : (
                'Most of the time went to cold installs and repeated work. We measured every step before changing anything.'
              )}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
