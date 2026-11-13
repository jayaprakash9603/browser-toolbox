export type ChartToken = 1 | 2 | 3 | 4 | 5

export function chartColor(token: ChartToken): string {
  return `hsl(var(--chart-${token}))`
}

export const CHART_SERIES = [1, 2, 3, 4, 5].map((n) => chartColor(n as ChartToken))

export function chartColorAt(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length]!
}
