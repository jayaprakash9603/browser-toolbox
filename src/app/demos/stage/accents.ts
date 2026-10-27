/** Same per-category accents as the website, so a demo looks identical in both places. */
const CATEGORY_ACCENTS: Record<string, string> = {
  clipboard: '#a78bfa',
  text: '#818cf8',
  developer: '#7073f4',
  qa: '#2dd4bf',
  api: '#22d3ee',
  web: '#38bdf8',
  data: '#60a5fa',
  design: '#f472b6',
  security: '#34d399',
  privacy: '#4ade80',
  sites: '#fb7185',
  calculators: '#fbbf24',
  datetime: '#f59e0b',
  screenshots: '#c084fc',
  image: '#e879f9',
  files: '#94a3b8',
  generators: '#a3e635',
  seo: '#facc15',
  productivity: '#fb923c',
  browser: '#7dd3fc',
  storage: '#5eead4',
  accessibility: '#86efac',
}

export function categoryAccent(categoryId: string) {
  return CATEGORY_ACCENTS[categoryId] ?? '#6366f1'
}
