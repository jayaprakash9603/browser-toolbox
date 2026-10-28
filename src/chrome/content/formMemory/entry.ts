import type { Entry } from './types'

export const nodesOf = (entry: Entry): Element[] => (entry.widget ? [entry.widget.host, ...entry.widget.items] : entry.els)
export const firstNode = (entry: Entry): Element => entry.widget?.host ?? entry.els[0]
export const radiosOf = (entry: Entry): Element[] => entry.widget?.items ?? entry.els
