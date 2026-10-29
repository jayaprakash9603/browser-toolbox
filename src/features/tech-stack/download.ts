export const TECH_STACK_FEEDBACK_URL =
  'https://github.com/jayaprakash9603/browser-toolbox/issues/new?title=Tech%20stack%3A%20wrong%20or%20missing%20technology'

function downloadText(text: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(csv: string, filename: string): void {
  downloadText(csv, filename, 'text/csv;charset=utf-8')
}

export function downloadJson(json: string, filename: string): void {
  downloadText(json, filename, 'application/json')
}
