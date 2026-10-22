export function applyFilenameTemplate(
  template: string,
  vars: {
    title: string
    date: string
    time: string
    domain: string
    ext: string
    url?: string
  },
): string {
  const safeTitle = sanitizeFilenamePart(vars.title || 'screenshot')
  const safeDomain = sanitizeFilenamePart(vars.domain || 'page')
  return template
    .replace(/\{title\}/gi, safeTitle)
    .replace(/\{date\}/gi, vars.date)
    .replace(/\{time\}/gi, vars.time)
    .replace(/\{domain\}/gi, safeDomain)
    .replace(/\{ext\}/gi, vars.ext)
    .replace(/\{url\}/gi, sanitizeFilenamePart(vars.url ?? ''))
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'screenshot'
}

export function formatDateParts(d = new Date()): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  return { date, time }
}
