export const JSON_TABS = ['format', 'validate', 'tree', 'path', 'convert'] as const
export type JsonTab = (typeof JSON_TABS)[number]

export const JSON_CONVERT_TARGETS = ['csv', 'xml', 'ts', 'markdown'] as const
export type JsonConvertTarget = (typeof JSON_CONVERT_TARGETS)[number]
