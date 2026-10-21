export type PageSvgItem = {
  id: string
  label: string
  source: 'inline' | 'img'
  markup: string
}

export function collectPageSvgs(): PageSvgItem[] {
  const items: PageSvgItem[] = []
  let i = 0
  document.querySelectorAll('svg').forEach((svg) => {
    if (svg.closest('svg svg')) return
    const markup = svg.outerHTML
    items.push({ id: `inline-${i++}`, label: svg.getAttribute('aria-label') || `SVG ${i}`, source: 'inline', markup })
  })
  document.querySelectorAll<HTMLImageElement>('img[src$=".svg"], img[src*=".svg?"]').forEach((img) => {
    items.push({
      id: `img-${i++}`,
      label: img.alt || img.src,
      source: 'img',
      markup: `<img src="${img.src}" alt="${img.alt ?? ''}" />`,
    })
  })
  return items
}

export function svgToJsx(markup: string): string {
  return markup
    .replace(/class=/g, 'className=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
}
