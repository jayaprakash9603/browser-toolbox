export const TECH_STACK_FEEDBACK_URL =
  'https://github.com/jayaprakash9603/browser-toolbox/issues/new?title=Tech%20stack%3A%20wrong%20or%20missing%20technology'

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
