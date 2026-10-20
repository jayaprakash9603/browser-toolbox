export const NETMON_ROUTE = '/tools/browser/internet-monitor'

export const NETMON_TABS = ['realtime', 'log', 'stats', 'settings'] as const
export type NetmonTab = (typeof NETMON_TABS)[number]

export function netmonTabRoute(tab: NetmonTab): string {
  return `${NETMON_ROUTE}?tab=${tab}`
}
