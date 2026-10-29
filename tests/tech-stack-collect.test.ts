import { afterEach, describe, expect, it } from 'vitest'

import { collectDomSignals, collectJsValues } from '@/features/tech-stack/inPage'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  for (const key of ['React', 'webpackChunkapp', 'Shopify', '__REACT_DEVTOOLS_GLOBAL_HOOK__'])
    delete (window as unknown as Record<string, unknown>)[key]
})

describe('collectJsValues', () => {
  it('reads dotted paths, wildcard prefixes and ignores missing ones', () => {
    Object.assign(window, { React: { version: '18.2.0' }, webpackChunkapp: [], Shopify: { theme: {} } })
    const found = collectJsValues(['React.version', 'webpackChunk*', 'Shopify', 'Vue.version', 'Shopify.theme.name'])
    expect(found).toEqual({ 'React.version': '18.2.0', 'webpackChunk*': '', Shopify: '' })
  })

  it('infers React from the DevTools hook when globals are stripped', () => {
    Object.assign(window, {
      __REACT_DEVTOOLS_GLOBAL_HOOK__: {
        renderers: new Map([[1, { version: '19.1.0' }]]),
      },
    })
    expect(collectJsValues(['React.version', '__REACT_DEVTOOLS_GLOBAL_HOOK__'])).toEqual({
      'React.version': '19.1.0',
      __REACT_DEVTOOLS_GLOBAL_HOOK__: '',
    })
    delete (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__
  })

  it('treats a throwing getter as absent', () => {
    Object.defineProperty(window, 'explosive', { configurable: true, get: () => { throw new Error('boom') } })
    expect(collectJsValues(['explosive.value'])).toEqual({})
    delete (window as unknown as Record<string, unknown>).explosive
  })
})

describe('collectDomSignals', () => {
  it('gathers resources, meta, selector matches and page facts', async () => {
    document.documentElement.lang = 'en'
    document.head.innerHTML = `
      <title>Demo shop</title>
      <meta name="generator" content="WordPress 6.5">
      <meta property="og:title" content="Demo">
      <meta name="description" content="A demo page">
      <link rel="stylesheet" href="https://cdn.example.com/site.css">
      <link rel="canonical" href="https://example.com/">
      <link type="application/rss+xml" href="https://example.com/feed.xml">
      <link type="application/rss+xml" href="javascript:alert(1)">
      <script src="https://js.stripe.com/v3/"></script>
      <script>window.dataLayer = []</script>`
    document.body.innerHTML = `
      <div id="__next"></div>
      <a href="https://github.com/acme/widget">code</a>
      <a href="https://twitter.com/intent/tweet?text=hi">share</a>
      <a href="mailto:hello%40example.com?subject=x">mail</a>
      <a href="tel:+15551234567">call</a>
      <img src="https://res.cloudinary.com/demo/a.png"><form></form>`

    const scan = await collectDomSignals(['#__next', '.missing', '[bad selector'])

    expect(scan.signals.scripts).toEqual(['https://js.stripe.com/v3/'])
    expect(scan.signals.resources).toEqual(
      expect.arrayContaining(['https://cdn.example.com/site.css', 'https://res.cloudinary.com/demo/a.png']),
    )
    expect(scan.signals.inlineScripts).toContain('dataLayer')
    expect(scan.signals.meta).toMatchObject({ generator: 'WordPress 6.5', 'og:title': 'Demo' })
    expect(scan.signals.domMatches).toEqual(['#__next'])
    expect(scan.facts).toMatchObject({
      title: 'Demo shop',
      description: 'A demo page',
      language: 'en',
      canonical: 'https://example.com/',
      generator: 'WordPress 6.5',
      social: [{ network: 'GitHub', url: 'https://github.com/acme/widget' }],
      emails: ['hello@example.com'],
      phones: ['+15551234567'],
      feeds: ['https://example.com/feed.xml'],
    })
    expect(scan.facts.counts.forms).toBe(1)
  })
})
