import { runAllSeoChecks } from './checks'
import { scoreSeoChecks } from './score'
import type { SeoNetworkContext, SeoPageData, SeoReport } from './types'

export function buildSeoReport(page: SeoPageData, network: SeoNetworkContext): SeoReport {
  const checks = runAllSeoChecks(page, network)
  const { score, byCategory } = scoreSeoChecks(checks)
  return { score, checks, page, network, byCategory }
}
