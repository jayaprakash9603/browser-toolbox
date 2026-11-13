export function domainFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return host.replace(/^www\./i, '')
  } catch {
    return ''
  }
}
